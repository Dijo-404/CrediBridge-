import { test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { registerSessionRoutes } from '../routes/sessions.js';
import { registerVendorRoutes } from '../routes/vendors.js';
import { createVendor, createSession } from '../db/store.js';
import { settleSessionById } from '../services/settlement.js';

async function buildApp() {
	const app = Fastify();
	await registerVendorRoutes(app);
	await registerSessionRoutes(app);
	await app.ready();
	return app;
}

test('GET /api/sessions/:id/efirc returns 409 before settlement', async () => {
	const app = await buildApp();
	const vendor = await createVendor({
		name: 'Efirc Co',
		gst_number: '07ABCDE1234F1Z9',
		pan_number: 'ABCDE1234F',
		ad_bank_account: '999',
		solana_wallet: 'walletX',
		purpose_code: 'S1007',
	});
	const session = await createSession({ vendor, amount_usd: 1000 });
	const res = await app.inject({ method: 'GET', url: `/api/sessions/${session.id}/efirc` });
	assert.equal(res.statusCode, 409);
	await app.close();
});

test('GET /api/sessions/:id/efirc returns a PDF after settlement', async () => {
	const app = await buildApp();
	const vendor = await createVendor({
		name: 'Efirc Co 2',
		gst_number: '07ABCDE1234F1Z8',
		pan_number: 'ABCDE1234G',
		ad_bank_account: '888',
		solana_wallet: 'walletY',
		purpose_code: 'S1007',
	});
	const session = await createSession({ vendor, amount_usd: 1500 });
	await settleSessionById(session.id);

	const res = await app.inject({ method: 'GET', url: `/api/sessions/${session.id}/efirc` });
	assert.equal(res.statusCode, 200);
	assert.equal(res.headers['content-type'], 'application/pdf');
	const body = res.rawPayload as Buffer;
	assert.ok(body.length > 100, 'PDF body should be non-empty');
	assert.equal(body.subarray(0, 4).toString(), '%PDF');
	await app.close();
});

test('GET /api/sessions returns sessions filtered by vendor', async () => {
	const app = await buildApp();
	const v1 = await createVendor({
		name: 'List Co',
		gst_number: '07LISTC1234F1Z9',
		pan_number: 'LISTC1234F',
		ad_bank_account: '777',
		solana_wallet: 'walletZ',
		purpose_code: 'S1102',
	});
	const v2 = await createVendor({
		name: 'Other Co',
		gst_number: '07OTHER1234F1Z9',
		pan_number: 'OTHER1234F',
		ad_bank_account: '666',
		solana_wallet: 'walletW',
		purpose_code: 'S0802',
	});
	await createSession({ vendor: v1, amount_usd: 100 });
	await createSession({ vendor: v1, amount_usd: 200 });
	await createSession({ vendor: v2, amount_usd: 300 });

	const res = await app.inject({ method: 'GET', url: `/api/sessions?vendorId=${v1.id}` });
	assert.equal(res.statusCode, 200);
	const json = res.json() as { sessions: Array<{ vendor_id: string }> };
	assert.ok(json.sessions.length >= 2);
	assert.ok(json.sessions.every((s) => s.vendor_id === v1.id));
	await app.close();
});
