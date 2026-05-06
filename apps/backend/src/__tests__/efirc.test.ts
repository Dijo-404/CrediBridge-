import { test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';

import { registerSessionRoutes } from '../routes/sessions';
import { registerVendorRoutes } from '../routes/vendors';
import { createVendor, createSession } from '../db/store';
import { settleSessionById } from '../services/settlement';

async function buildApp() {
	const app = Fastify();
	await registerVendorRoutes(app);
	await registerSessionRoutes(app);
	await app.ready();
	return app;
}

test('GET /api/sessions/:id/efirc returns 409 before settlement', async () => {
	const app = await buildApp();
	const vendor = createVendor({
		name: 'Efirc Co',
		gst_number: '07ABCDE1234F1Z9',
		pan_number: 'ABCDE1234F',
		ad_bank_account: '999',
		solana_wallet: 'walletX',
		purpose_code: 'S1007',
	});
	const session = createSession({ vendor, amount_usd: 1000 });
	const res = await app.inject({ method: 'GET', url: `/api/sessions/${session.id}/efirc` });
	assert.equal(res.statusCode, 409);
	await app.close();
});

test('GET /api/sessions/:id/efirc returns a PDF after settlement', async () => {
	const app = await buildApp();
	const vendor = createVendor({
		name: 'Efirc Co 2',
		gst_number: '07ABCDE1234F1Z8',
		pan_number: 'ABCDE1234G',
		ad_bank_account: '888',
		solana_wallet: 'walletY',
		purpose_code: 'S1007',
	});
	const session = createSession({ vendor, amount_usd: 1500 });
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
	const vendor = createVendor({
		name: 'List Co',
		gst_number: '07LISTC1234F1Z9',
		pan_number: 'LISTC1234F',
		ad_bank_account: '777',
		solana_wallet: 'walletZ',
		purpose_code: 'S1102',
	});
	createSession({ vendor, amount_usd: 100 });
	createSession({ vendor, amount_usd: 200 });

	const res = await app.inject({
		method: 'GET',
		url: `/api/sessions?vendorId=${vendor.id}`,
	});
	assert.equal(res.statusCode, 200);
	const json = res.json() as { sessions: Array<{ vendor_id: string }> };
	assert.ok(json.sessions.length >= 2);
	assert.ok(json.sessions.every((s) => s.vendor_id === vendor.id));
	await app.close();
});
