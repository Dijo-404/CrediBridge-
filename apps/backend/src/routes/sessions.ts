import { FastifyInstance } from 'fastify';
import { createSession, getSession, getVendor, listSessions, getEfircDocument } from '../db/store.js';
import { createDodoPaymentLink } from '../services/dodo.js';
import { generateEfirc } from '../services/efirc.js';
import { executeOfframp } from '../services/offramp.js';
import { settleSessionById } from '../services/settlement.js';

interface CreateSessionBody {
	vendorId?: string;
	amountUsd?: number;
	buyerCountry?: string;
	invoiceNumber?: string;
	customer?: { name?: string; email?: string };
	billing?: { city?: string; country?: string; state?: string; zipcode?: string; street?: string };
}

export async function registerSessionRoutes(app: FastifyInstance) {
	app.post('/api/sessions/create', async (request, reply) => {
		const body = request.body as CreateSessionBody;

		if (
			!body?.vendorId ||
			typeof body.amountUsd !== 'number' ||
			!Number.isFinite(body.amountUsd) ||
			body.amountUsd <= 0
		) {
			reply.code(400).send({ error: 'vendorId and a positive numeric amountUsd are required' });
			return;
		}

		const vendor = await getVendor(body.vendorId);
		if (!vendor) {
			reply.code(404).send({ error: 'Vendor not found' });
			return;
		}

		const session = await createSession({
			vendor,
			amount_usd: body.amountUsd,
			buyer_country: body.buyerCountry,
			invoice_number: body.invoiceNumber,
		});

		let checkout: { id: string; payment_link: string } | undefined;
		try {
			checkout = await createDodoPaymentLink({
				vendor,
				session,
				customer: {
					name: body.customer?.name ?? 'Foreign Customer',
					email: body.customer?.email ?? 'buyer@example.com',
				},
				billing: {
					city: body.billing?.city ?? 'San Francisco',
					country: body.billing?.country ?? body.buyerCountry ?? 'US',
					state: body.billing?.state,
					zipcode: body.billing?.zipcode,
					street: body.billing?.street,
				},
			});
		} catch (err) {
			request.log.warn({ err }, 'Dodo payment link creation failed; returning session only');
		}

		reply.code(201).send({ session, checkout });
	});

	app.get('/api/sessions/:id', async (request, reply) => {
		const { id } = request.params as { id: string };
		const session = await getSession(id);
		if (!session) {
			reply.code(404).send({ error: 'Session not found' });
			return;
		}
		reply.send({ session });
	});

	app.get('/api/sessions', async (request, reply) => {
		const { vendorId } = request.query as { vendorId?: string };
		reply.send({ sessions: await listSessions(vendorId) });
	});

	app.get('/api/sessions/:id/efirc', async (request, reply) => {
		const { id } = request.params as { id: string };
		const session = await getSession(id);
		if (!session) {
			reply.code(404).send({ error: 'Session not found' });
			return;
		}
		if (session.status !== 'efirc_generated' && session.status !== 'offramped') {
			reply.code(409).send({ error: 'e-FIRC not yet available for this session' });
			return;
		}

		const stored = await getEfircDocument(id);
		if (stored) {
			const pdf = Buffer.from(stored, 'base64');
			return reply
				.header('content-type', 'application/pdf')
				.header('content-disposition', `attachment; filename="efirc-${id}.pdf"`)
				.send(pdf);
		}

		const vendor = await getVendor(session.vendor_id);
		if (!vendor) {
			reply.code(404).send({ error: 'Vendor not found' });
			return;
		}
		const offramp = await executeOfframp(session, vendor);
		const efirc = await generateEfirc(session, vendor, offramp);
		const pdf = Buffer.from(efirc.base64, 'base64');
		reply
			.header('content-type', 'application/pdf')
			.header('content-disposition', `attachment; filename="${efirc.filename}"`)
			.send(pdf);
	});

	app.post('/api/sessions/:id/settle', async (request, reply) => {
		const { id } = request.params as { id: string };
		try {
			const result = await settleSessionById(id);
			reply.send(result);
		} catch (error) {
			const message = (error as Error).message;
			const status = /not found/i.test(message) ? 404 : 500;
			reply.code(status).send({ error: message });
		}
	});
}
