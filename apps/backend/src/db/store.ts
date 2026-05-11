import { randomUUID } from 'crypto';
import { getPool } from './pool.js';
import {
	CreateSessionInput,
	CreateVendorInput,
	PaymentSession,
	Vendor,
} from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToVendor(row: Record<string, unknown>): Vendor {
	return {
		id: row.id as string,
		name: row.name as string,
		gst_number: row.gst_number as string,
		pan_number: row.pan_number as string,
		ad_bank_account: row.ad_bank_account as string,
		solana_wallet: row.solana_wallet as string,
		purpose_code: row.purpose_code as Vendor['purpose_code'],
		edpms_irm_number: row.edpms_irm_number as string | undefined,
	};
}

function rowToSession(row: Record<string, unknown>): PaymentSession {
	return {
		id: row.id as string,
		vendor_id: row.vendor_id as string,
		dodo_session_id: row.dodo_session_id as string | undefined,
		amount_usd: Number(row.amount_usd),
		buyer_country: row.buyer_country as string | undefined,
		regulatory_metadata: {
			purpose_code: row.purpose_code as string,
			gst_number: row.gst_number as string,
			export_classification: row.export_classification as string,
			invoice_number: row.invoice_number as string,
			edpms_irm_ref: row.edpms_irm_ref as string | undefined,
		},
		status: row.status as PaymentSession['status'],
		solana_tx_signature: row.solana_tx_signature as string | undefined,
		efirc_document_url: row.efirc_document_url as string | undefined,
		created_at: (row.created_at as Date).toISOString(),
	};
}

// ---------------------------------------------------------------------------
// Vendors
// ---------------------------------------------------------------------------

export async function createVendor(input: CreateVendorInput): Promise<Vendor> {
	const pool = getPool();
	const id = randomUUID();
	const { rows } = await pool.query(
		`INSERT INTO vendors
		   (id, name, gst_number, pan_number, ad_bank_account, solana_wallet, purpose_code, edpms_irm_number)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		 RETURNING *`,
		[
			id,
			input.name,
			input.gst_number,
			input.pan_number,
			input.ad_bank_account,
			input.solana_wallet,
			input.purpose_code,
			input.edpms_irm_number ?? null,
		]
	);
	return rowToVendor(rows[0]);
}

export async function getVendor(id: string): Promise<Vendor | undefined> {
	const pool = getPool();
	const { rows } = await pool.query('SELECT * FROM vendors WHERE id=$1', [id]);
	return rows[0] ? rowToVendor(rows[0]) : undefined;
}

export async function listVendors(): Promise<Vendor[]> {
	const pool = getPool();
	const { rows } = await pool.query('SELECT * FROM vendors ORDER BY created_at ASC');
	return rows.map(rowToVendor);
}

export async function updateVendorRazorpayFundAccount(
	vendorId: string,
	fundAccountId: string
): Promise<void> {
	const pool = getPool();
	await pool.query(
		'UPDATE vendors SET razorpay_fund_account_id=$1, updated_at=NOW() WHERE id=$2',
		[fundAccountId, vendorId]
	);
}

export async function getVendorRazorpayFundAccount(
	vendorId: string
): Promise<string | null> {
	const pool = getPool();
	const { rows } = await pool.query(
		'SELECT razorpay_fund_account_id FROM vendors WHERE id=$1',
		[vendorId]
	);
	return (rows[0]?.razorpay_fund_account_id as string | null) ?? null;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function createSession(input: CreateSessionInput): Promise<PaymentSession> {
	const pool = getPool();
	const id = randomUUID();
	const invoiceNumber = input.invoice_number ?? `INV-${Date.now()}`;
	const { rows } = await pool.query(
		`INSERT INTO payment_sessions
		   (id, vendor_id, amount_usd, buyer_country,
		    purpose_code, gst_number, invoice_number, export_classification, edpms_irm_ref,
		    status)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')
		 RETURNING *`,
		[
			id,
			input.vendor.id,
			input.amount_usd,
			input.buyer_country ?? null,
			input.vendor.purpose_code,
			input.vendor.gst_number,
			invoiceNumber,
			'software_services',
			input.vendor.edpms_irm_number ?? null,
		]
	);
	return rowToSession(rows[0]);
}

export async function getSession(id: string): Promise<PaymentSession | undefined> {
	const pool = getPool();
	const { rows } = await pool.query(
		'SELECT * FROM payment_sessions WHERE id=$1',
		[id]
	);
	return rows[0] ? rowToSession(rows[0]) : undefined;
}

export async function listSessions(vendorId?: string): Promise<PaymentSession[]> {
	const pool = getPool();
	const { rows } = vendorId
		? await pool.query(
				'SELECT * FROM payment_sessions WHERE vendor_id=$1 ORDER BY created_at DESC',
				[vendorId]
			)
		: await pool.query('SELECT * FROM payment_sessions ORDER BY created_at DESC');
	return rows.map(rowToSession);
}

export async function updateSession(
	id: string,
	patch: Partial<PaymentSession>
): Promise<PaymentSession> {
	const pool = getPool();
	const sets: string[] = ['updated_at=NOW()'];
	const vals: unknown[] = [];
	let idx = 1;

	if (patch.status !== undefined) { sets.push(`status=$${idx++}`); vals.push(patch.status); }
	if (patch.dodo_session_id !== undefined) { sets.push(`dodo_session_id=$${idx++}`); vals.push(patch.dodo_session_id); }
	if (patch.solana_tx_signature !== undefined) { sets.push(`solana_tx_signature=$${idx++}`); vals.push(patch.solana_tx_signature); }
	if (patch.efirc_document_url !== undefined) { sets.push(`efirc_document_url=$${idx++}`); vals.push(patch.efirc_document_url); }

	vals.push(id);
	const { rows } = await pool.query(
		`UPDATE payment_sessions SET ${sets.join(',')} WHERE id=$${idx} RETURNING *`,
		vals
	);
	if (!rows[0]) throw new Error(`Session not found: ${id}`);
	return rowToSession(rows[0]);
}

export async function saveEfircDocument(sessionId: string, base64: string): Promise<void> {
	const pool = getPool();
	await pool.query(
		'UPDATE payment_sessions SET efirc_document=$1, updated_at=NOW() WHERE id=$2',
		[base64, sessionId]
	);
}

export async function getEfircDocument(sessionId: string): Promise<string | null> {
	const pool = getPool();
	const { rows } = await pool.query(
		'SELECT efirc_document FROM payment_sessions WHERE id=$1',
		[sessionId]
	);
	return (rows[0]?.efirc_document as string | null) ?? null;
}

// ---------------------------------------------------------------------------
// Webhook dedup (replaces the in-memory Set)
// ---------------------------------------------------------------------------

export async function markWebhookProcessed(
	webhookId: string,
	eventType: string
): Promise<boolean> {
	const pool = getPool();
	const { rowCount } = await pool.query(
		`INSERT INTO processed_webhooks (webhook_id, event_type)
		 VALUES ($1, $2)
		 ON CONFLICT (webhook_id) DO NOTHING`,
		[webhookId, eventType]
	);
	return (rowCount ?? 0) > 0;
}
