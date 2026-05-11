import { FastifyInstance } from 'fastify';
import { createVendor, getVendor, listVendors } from '../db/store.js';
import { getPurposeCode, PURPOSE_CODES } from '../services/purpose-codes.js';

interface CreateVendorBody {
	name?: string;
	gstNumber?: string;
	panNumber?: string;
	adBankAccount?: string;
	solanaWallet?: string;
	serviceType?: string;
	purposeCode?: string;
	edpmsIrmNumber?: string;
}

export async function registerVendorRoutes(app: FastifyInstance) {
	app.post('/api/vendors', async (request, reply) => {
		const body = request.body as CreateVendorBody;

		if (!body?.name || !body.gstNumber || !body.panNumber || !body.adBankAccount || !body.solanaWallet) {
			reply.code(400).send({
				error: 'name, gstNumber, panNumber, adBankAccount, solanaWallet are required',
			});
			return;
		}

		const purposeFromBody = body.purposeCode as keyof typeof PURPOSE_CODES | undefined;
		const purposeCode =
			(purposeFromBody && PURPOSE_CODES[purposeFromBody] ? purposeFromBody : undefined) ??
			getPurposeCode(body.serviceType);

		const vendor = await createVendor({
			name: body.name,
			gst_number: body.gstNumber,
			pan_number: body.panNumber,
			ad_bank_account: body.adBankAccount,
			solana_wallet: body.solanaWallet,
			purpose_code: purposeCode,
			edpms_irm_number: body.edpmsIrmNumber,
		});

		reply.code(201).send({ vendor });
	});

	app.get('/api/vendors/:id', async (request, reply) => {
		const { id } = request.params as { id: string };
		const vendor = await getVendor(id);
		if (!vendor) {
			reply.code(404).send({ error: 'Vendor not found' });
			return;
		}
		reply.send({ vendor });
	});

	app.get('/api/vendors', async (_request, reply) => {
		reply.send({ vendors: await listVendors() });
	});
}
