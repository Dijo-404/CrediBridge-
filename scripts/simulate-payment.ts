/**
 * End-to-end simulation script.
 *
 * Drives the locally-running CrediBridge backend through the full happy path:
 *   1. Create a vendor.
 *   2. Create a payment session.
 *   3. POST a synthetic Dodo webhook (HMAC-signed) to /webhooks/dodo.
 *   4. Poll the session until it reaches `efirc_generated`.
 *   5. Download the e-FIRC PDF.
 *
 * Usage:
 *   BACKEND_URL=http://localhost:3001 \
 *   DODO_WEBHOOK_SECRET=whsec_test \
 *     tsx scripts/simulate-payment.ts
 */

import { createHmac, randomUUID } from 'crypto';
import { promises as fs } from 'fs';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';
const WEBHOOK_SECRET = process.env.DODO_WEBHOOK_SECRET ?? 'whsec_test';

interface Vendor {
	id: string;
	name: string;
	gst_number: string;
	purpose_code: string;
}

interface Session {
	id: string;
	status: string;
	amount_usd: number;
	solana_tx_signature?: string;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
	const res = await fetch(`${BACKEND_URL}${path}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		throw new Error(`POST ${path} failed (${res.status}): ${await res.text()}`);
	}
	return (await res.json()) as T;
}

async function getJson<T>(path: string): Promise<T> {
	const res = await fetch(`${BACKEND_URL}${path}`);
	if (!res.ok) {
		throw new Error(`GET ${path} failed (${res.status}): ${await res.text()}`);
	}
	return (await res.json()) as T;
}

async function createVendor(): Promise<Vendor> {
	const { vendor } = await postJson<{ vendor: Vendor }>('/api/vendors', {
		name: 'Infra.so',
		gstNumber: '27AABCU9603R1ZM',
		panNumber: 'AABCU9603R',
		adBankAccount: '00112233445566',
		solanaWallet: 'BzVaXXrCQuSamEXAMPLE',
		serviceType: 'saas',
	});
	console.log(`Vendor created: ${vendor.id}`);
	return vendor;
}

async function createSession(vendorId: string): Promise<Session> {
	const { session } = await postJson<{ session: Session }>('/api/sessions/create', {
		vendorId,
		amountUsd: 5000,
		buyerCountry: 'US',
		invoiceNumber: `INV-${Date.now()}`,
	});
	console.log(`Session created: ${session.id} (status=${session.status})`);
	return session;
}

function signWebhook(payload: string, id: string, timestamp: number) {
	const signed = `${id}.${timestamp}.${payload}`;
	const sig = createHmac('sha256', WEBHOOK_SECRET).update(signed).digest('base64');
	return `v1,${sig}`;
}

async function fireDodoWebhook(session: Session) {
	const payload = JSON.stringify({
		type: 'payment.succeeded',
		data: {
			payment_id: `pay_${randomUUID()}`,
			amount: session.amount_usd * 100,
			currency: 'USD',
			status: 'succeeded',
			metadata: {
				credbridge_session_id: session.id,
				purpose_code: 'S1007',
				vendor_gst: '27AABCU9603R1ZM',
				vendor_pan: 'AABCU9603R',
			},
		},
	});

	const id = `whk_${randomUUID()}`;
	const timestamp = Math.floor(Date.now() / 1000);
	const signature = signWebhook(payload, id, timestamp);

	const res = await fetch(`${BACKEND_URL}/webhooks/dodo`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'webhook-id': id,
			'webhook-signature': signature,
			'webhook-timestamp': String(timestamp),
		},
		body: payload,
	});
	if (!res.ok) {
		throw new Error(`Webhook rejected (${res.status}): ${await res.text()}`);
	}
	console.log('Webhook delivered.');
}

async function pollUntilSettled(sessionId: string): Promise<Session> {
	const deadline = Date.now() + 30_000;
	while (Date.now() < deadline) {
		const { session } = await getJson<{ session: Session }>(
			`/api/sessions/${sessionId}`
		);
		console.log(`  status=${session.status}`);
		if (session.status === 'efirc_generated') return session;
		await new Promise((r) => setTimeout(r, 750));
	}
	throw new Error('Timed out waiting for session to settle');
}

async function downloadEfirc(sessionId: string) {
	const res = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/efirc`);
	if (!res.ok) {
		throw new Error(`e-FIRC download failed: ${res.status}`);
	}
	const buf = Buffer.from(await res.arrayBuffer());
	const filename = `efirc-${sessionId}.pdf`;
	await fs.writeFile(filename, buf);
	console.log(`e-FIRC saved to ${filename} (${buf.length} bytes)`);
}

async function main() {
	console.log(`Backend: ${BACKEND_URL}`);
	const vendor = await createVendor();
	const session = await createSession(vendor.id);
	await fireDodoWebhook(session);
	const settled = await pollUntilSettled(session.id);
	console.log(`\nFinal: ${settled.status}`);
	console.log(`Solana tx: ${settled.solana_tx_signature ?? '(missing)'}`);
	await downloadEfirc(session.id);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
