import { test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify, { FastifyInstance } from 'fastify';
import { registerSessionRoutes } from '../routes/sessions.js';
import { registerVendorRoutes } from '../routes/vendors.js';
import { createVendor, createSession, getSession } from '../db/store.js';
import { settleSessionById } from '../services/settlement.js';

async function buildApp(): Promise<FastifyInstance> {
	const app = Fastify();
	await registerSessionRoutes(app);
	await registerVendorRoutes(app);
	await app.ready();
	return app;
}

async function makeVendor() {
	return createVendor({
		name: 'Acme Software',
		gst_number: '29ABCDE1234F1Z5',
		pan_number: 'ABCDE1234F',
		ad_bank_account: '1234567890',
		solana_wallet: 'So1AnaWa11et',
		purpose_code: 'S1007',
	});
}

test('bug #1: amountUsd validation rejects 0', async () => {
	const app = await buildApp();
	const vendor = await makeVendor();
	const res = await app.inject({
		method: 'POST',
		url: '/api/sessions/create',
		payload: { vendorId: vendor.id, amountUsd: 0 },
	});
	assert.equal(res.statusCode, 400);
	await app.close();
});

test('bug #1: amountUsd validation rejects negative numbers', async () => {
	const app = await buildApp();
	const vendor = await makeVendor();
	const res = await app.inject({
		method: 'POST',
		url: '/api/sessions/create',
		payload: { vendorId: vendor.id, amountUsd: -100 },
	});
	assert.equal(res.statusCode, 400);
	await app.close();
});

test('bug #1: amountUsd validation rejects non-number', async () => {
	const app = await buildApp();
	const vendor = await makeVendor();
	const res = await app.inject({
		method: 'POST',
		url: '/api/sessions/create',
		payload: { vendorId: vendor.id, amountUsd: 'lots' },
	});
	assert.equal(res.statusCode, 400);
	await app.close();
});

test('bug #1: amountUsd validation rejects NaN/Infinity', async () => {
	const app = await buildApp();
	const vendor = await makeVendor();
	const res = await app.inject({
		method: 'POST',
		url: '/api/sessions/create',
		payload: { vendorId: vendor.id, amountUsd: Number.POSITIVE_INFINITY },
	});
	assert.equal(res.statusCode, 400);
	await app.close();
});

test('bug #1: amountUsd validation accepts a positive number', async () => {
	const app = await buildApp();
	const vendor = await makeVendor();
	const res = await app.inject({
		method: 'POST',
		url: '/api/sessions/create',
		payload: { vendorId: vendor.id, amountUsd: 5000 },
	});
	assert.equal(res.statusCode, 201);
	await app.close();
});

test('bug #2: /settle returns 404 when the session is missing', async () => {
	const app = await buildApp();
	const res = await app.inject({
		method: 'POST',
		url: '/api/sessions/does-not-exist/settle',
	});
	assert.equal(res.statusCode, 404);
	await app.close();
});

test('bug #2: /settle returns 404 (not 500) when the vendor is missing for the session', async () => {
	const app = await buildApp();
	const orphan = await createSession({
		vendor: {
			id: 'orphan-vendor-id',
			name: 'orphan',
			gst_number: 'x',
			pan_number: 'x',
			ad_bank_account: 'x',
			solana_wallet: 'x',
			purpose_code: 'S1007',
		},
		amount_usd: 1000,
	});
	const res = await app.inject({
		method: 'POST',
		url: `/api/sessions/${orphan.id}/settle`,
	});
	assert.equal(res.statusCode, 404, 'expected 404 for vendor-not-found, not 500');
	await app.close();
});

test('bug #3: settleSessionById does not mutate session state when the vendor is missing', async () => {
	const orphan = await createSession({
		vendor: {
			id: 'orphan-vendor-id-2',
			name: 'orphan',
			gst_number: 'x',
			pan_number: 'x',
			ad_bank_account: 'x',
			solana_wallet: 'x',
			purpose_code: 'S1007',
		},
		amount_usd: 1000,
	});
	const before = (await getSession(orphan.id))!.status;
	await assert.rejects(() => settleSessionById(orphan.id), /Vendor not found/);
	const after = (await getSession(orphan.id))!.status;
	assert.equal(before, 'pending');
	assert.equal(after, 'pending');
});

test('bug #3: settleSessionById refuses to re-settle an already-finalized session', async () => {
	const vendor = await makeVendor();
	const session = await createSession({ vendor, amount_usd: 2500 });
	const result = await settleSessionById(session.id);
	assert.equal(result.session.status, 'efirc_generated');
	await assert.rejects(() => settleSessionById(session.id), /already settled/);
	assert.equal((await getSession(session.id))!.status, 'efirc_generated');
});
