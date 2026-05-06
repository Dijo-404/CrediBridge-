import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';

import { registerWebhookRoutes } from '../routes/webhooks';
import { registerSessionRoutes } from '../routes/sessions';
import { registerVendorRoutes } from '../routes/vendors';
import { createVendor, createSession, getSession } from '../db/store';
import { verifyDodoWebhook } from '../services/dodo';

const SECRET = 'whsec_unit_test';

before(() => {
	process.env.DODO_WEBHOOK_SECRET = SECRET;
});

async function buildApp(): Promise<FastifyInstance> {
	const app = Fastify();
	await registerVendorRoutes(app);
	await registerSessionRoutes(app);
	await registerWebhookRoutes(app);
	await app.ready();
	return app;
}

function sign(rawBody: string, id: string, ts: number) {
	const sig = createHmac('sha256', SECRET).update(`${id}.${ts}.${rawBody}`).digest('base64');
	return `v1,${sig}`;
}

test('verifyDodoWebhook accepts a properly signed payload', () => {
	const body = JSON.stringify({ type: 'payment.succeeded', data: {} });
	const id = 'whk_1';
	const ts = Math.floor(Date.now() / 1000);
	assert.equal(
		verifyDodoWebhook(body, {
			'webhook-id': id,
			'webhook-timestamp': String(ts),
			'webhook-signature': sign(body, id, ts),
		}, SECRET),
		true
	);
});

test('verifyDodoWebhook rejects a tampered body', () => {
	const body = JSON.stringify({ type: 'payment.succeeded', data: {} });
	const id = 'whk_2';
	const ts = Math.floor(Date.now() / 1000);
	const sig = sign(body, id, ts);
	assert.equal(
		verifyDodoWebhook(body + 'x', {
			'webhook-id': id,
			'webhook-timestamp': String(ts),
			'webhook-signature': sig,
		}, SECRET),
		false
	);
});

test('verifyDodoWebhook rejects stale timestamp', () => {
	const body = JSON.stringify({ type: 'payment.succeeded', data: {} });
	const id = 'whk_3';
	const ts = Math.floor(Date.now() / 1000) - 10_000; // way outside the 5-min window
	assert.equal(
		verifyDodoWebhook(body, {
			'webhook-id': id,
			'webhook-timestamp': String(ts),
			'webhook-signature': sign(body, id, ts),
		}, SECRET),
		false
	);
});

test('webhook route rejects unsigned payload with 401', async () => {
	const app = await buildApp();
	const res = await app.inject({
		method: 'POST',
		url: '/webhooks/dodo',
		headers: { 'content-type': 'application/json' },
		payload: { type: 'payment.succeeded', data: {} },
	});
	assert.equal(res.statusCode, 401);
	await app.close();
});

test('webhook route processes a signed payment.succeeded end-to-end', async () => {
	const app = await buildApp();
	const vendor = createVendor({
		name: 'Test Co',
		gst_number: '27AABCU9603R1ZM',
		pan_number: 'AABCU9603R',
		ad_bank_account: '111',
		solana_wallet: 'wallet',
		purpose_code: 'S1007',
	});
	const session = createSession({ vendor, amount_usd: 1234 });

	const body = JSON.stringify({
		type: 'payment.succeeded',
		data: {
			payment_id: `pay_${randomUUID()}`,
			amount: 123_400,
			currency: 'USD',
			metadata: {
				credbridge_session_id: session.id,
				purpose_code: 'S1007',
				vendor_gst: vendor.gst_number,
				vendor_pan: vendor.pan_number,
			},
		},
	});
	const id = `whk_${randomUUID()}`;
	const ts = Math.floor(Date.now() / 1000);

	const res = await app.inject({
		method: 'POST',
		url: '/webhooks/dodo',
		headers: {
			'content-type': 'application/json',
			'webhook-id': id,
			'webhook-timestamp': String(ts),
			'webhook-signature': sign(body, id, ts),
		},
		payload: body,
	});
	assert.equal(res.statusCode, 200);

	// The queue runs asynchronously; wait briefly for the session to settle.
	for (let i = 0; i < 30; i++) {
		if (getSession(session.id)?.status === 'efirc_generated') break;
		await new Promise((r) => setTimeout(r, 50));
	}

	const final = getSession(session.id);
	assert.ok(final, 'session must exist after webhook');
	assert.equal(final!.status, 'efirc_generated');
	assert.ok(final!.solana_tx_signature, 'solana signature should be populated');
	assert.ok(final!.dodo_session_id, 'dodo payment id should be persisted');
	await app.close();
});

test('webhook route deduplicates by webhook-id', async () => {
	const app = await buildApp();
	const vendor = createVendor({
		name: 'Dedup Co',
		gst_number: '29AABCD1234E1Z5',
		pan_number: 'AABCD1234E',
		ad_bank_account: '222',
		solana_wallet: 'wallet2',
		purpose_code: 'S0802',
	});
	const session = createSession({ vendor, amount_usd: 99 });

	const body = JSON.stringify({
		type: 'payment.succeeded',
		data: {
			payment_id: 'pay_dup',
			amount: 9_900,
			metadata: {
				credbridge_session_id: session.id,
				purpose_code: 'S0802',
				vendor_gst: vendor.gst_number,
				vendor_pan: vendor.pan_number,
			},
		},
	});
	const id = `whk_${randomUUID()}`;
	const ts = Math.floor(Date.now() / 1000);
	const headers = {
		'content-type': 'application/json',
		'webhook-id': id,
		'webhook-timestamp': String(ts),
		'webhook-signature': sign(body, id, ts),
	};

	const first = await app.inject({ method: 'POST', url: '/webhooks/dodo', headers, payload: body });
	const second = await app.inject({ method: 'POST', url: '/webhooks/dodo', headers, payload: body });

	assert.equal(first.statusCode, 200);
	assert.equal(second.statusCode, 200);
	assert.match(second.body, /deduped/);
	await app.close();
});
