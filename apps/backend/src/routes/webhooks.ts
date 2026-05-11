import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import { parseDodoWebhook, verifyDodoWebhook } from '../services/dodo.js';
import { paymentQueue } from '../queues/payment.js';
import { handleSolanaFinality } from '../services/settlement.js';
import { markWebhookProcessed, updateSession } from '../db/store.js';
import type { Job } from 'bullmq';
import type { BridgeJobPayload } from '../queues/payment.js';

paymentQueue.process(async (job: Job<BridgeJobPayload>) => {
	const { sessionId, dodoPaymentId } = job.data;
	await updateSession(sessionId, {
		status: 'dodo_captured',
		dodo_session_id: dodoPaymentId ?? `dodo-${sessionId}`,
	});
	await handleSolanaFinality(sessionId);
});

const webhookPlugin: FastifyPluginAsync = async (instance) => {
	instance.addContentTypeParser(
		'application/json',
		{ parseAs: 'string' },
		(_req, body, done) => {
			try {
				const parsed = body.length ? JSON.parse(body as string) : {};
				done(null, { __raw: body, parsed });
			} catch (err) {
				done(err as Error, undefined);
			}
		}
	);

	instance.post('/webhooks/dodo', async (request: FastifyRequest, reply) => {
		const secret = process.env.DODO_WEBHOOK_SECRET;
		const wrapper = request.body as { __raw?: string; parsed?: unknown } | undefined;
		const rawBody = wrapper?.__raw ?? '';

		if (!secret) {
			reply.code(500).send({ error: 'DODO_WEBHOOK_SECRET not configured' });
			return;
		}

		const headers = {
			'webhook-id': request.headers['webhook-id'] as string | undefined,
			'webhook-signature': request.headers['webhook-signature'] as string | undefined,
			'webhook-timestamp': request.headers['webhook-timestamp'] as string | undefined,
		};

		if (!verifyDodoWebhook(rawBody, headers, secret)) {
			reply.code(401).send({ error: 'Invalid signature' });
			return;
		}

		const webhookId = headers['webhook-id']!;
		const event = parseDodoWebhook(rawBody);

		const inserted = await markWebhookProcessed(webhookId, event.type);
		if (!inserted) {
			reply.send({ ok: true, deduped: true });
			return;
		}

		if (event.type === 'payment.succeeded') {
			const metadata = event.data.metadata ?? {};
			const sessionId = metadata.credbridge_session_id;
			if (!sessionId) {
				reply.code(400).send({ error: 'Missing credbridge_session_id in metadata' });
				return;
			}
			await paymentQueue.add('bridge-to-solana', {
				sessionId,
				amountUsd: (event.data.amount ?? 0) / 100,
				purposeCode: metadata.purpose_code ?? 'S0899',
				vendorGst: metadata.vendor_gst ?? '',
				vendorPan: metadata.vendor_pan ?? '',
				dodoPaymentId: event.data.payment_id,
			});
		}

		reply.send({ ok: true });
	});
};

export async function registerWebhookRoutes(app: FastifyInstance) {
	await app.register(webhookPlugin);
}
