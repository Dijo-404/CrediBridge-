import { createHmac, timingSafeEqual } from 'crypto';
import { PaymentSession, Vendor } from '../types';

const DODO_API_BASE = process.env.DODO_API_BASE ?? 'https://api.dodopayments.com';

export interface DodoCheckoutLink {
	id: string;
	payment_link: string;
	client_secret?: string;
}

export interface DodoCreatePaymentInput {
	vendor: Vendor;
	session: PaymentSession;
	customer: {
		name: string;
		email: string;
	};
	billing: {
		city: string;
		country: string;
		state?: string;
		zipcode?: string;
		street?: string;
	};
}

function buildMetadata(vendor: Vendor, session: PaymentSession) {
	return {
		purpose_code: vendor.purpose_code,
		vendor_gst: vendor.gst_number,
		vendor_pan: vendor.pan_number,
		export_classification: session.regulatory_metadata.export_classification,
		credbridge_session_id: session.id,
		invoice_number: session.regulatory_metadata.invoice_number,
		edpms_irm_ref: vendor.edpms_irm_number ?? '',
	};
}

export async function createDodoPaymentLink(
	input: DodoCreatePaymentInput
): Promise<DodoCheckoutLink> {
	const apiKey = process.env.DODO_API_KEY;
	const productId = process.env.DODO_UNIVERSAL_PRODUCT_ID;

	if (!apiKey || !productId) {
		// In MVP/dev mode, emit a deterministic mock link so the flow stays exercisable
		// without a live Dodo account.
		return {
			id: `mock_${input.session.id}`,
			payment_link: `https://test.dodopayments.com/mock/${input.session.id}`,
		};
	}

	const body = {
		billing: input.billing,
		customer: input.customer,
		product_cart: [{ product_id: productId, quantity: 1 }],
		payment_link: true,
		metadata: buildMetadata(input.vendor, input.session),
	};

	const response = await fetch(`${DODO_API_BASE}/payments`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'content-type': 'application/json',
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Dodo API error ${response.status}: ${text}`);
	}

	const json = (await response.json()) as DodoCheckoutLink;
	return json;
}

export interface DodoWebhookHeaders {
	'webhook-id'?: string;
	'webhook-signature'?: string;
	'webhook-timestamp'?: string;
}

export function verifyDodoWebhook(
	rawBody: string,
	headers: DodoWebhookHeaders,
	secret: string
): boolean {
	const id = headers['webhook-id'];
	const timestamp = headers['webhook-timestamp'];
	const signatureHeader = headers['webhook-signature'];

	if (!id || !timestamp || !signatureHeader) {
		return false;
	}

	// Reject requests where the timestamp is more than 5 minutes off — protects against replay.
	const ts = Number(timestamp);
	if (!Number.isFinite(ts)) {
		return false;
	}
	const skewSeconds = Math.abs(Math.floor(Date.now() / 1000) - ts);
	if (skewSeconds > 300) {
		return false;
	}

	const signedPayload = `${id}.${timestamp}.${rawBody}`;
	const expected = createHmac('sha256', secret).update(signedPayload).digest('base64');

	// Header format from the Standard Webhooks spec: "v1,<sig> v1,<sig2>"
	const candidates = signatureHeader
		.split(' ')
		.map((part) => part.trim())
		.filter(Boolean)
		.map((part) => (part.startsWith('v1,') ? part.slice(3) : part));

	return candidates.some((candidate) => safeEqual(candidate, expected));
}

function safeEqual(a: string, b: string): boolean {
	const bufA = Buffer.from(a);
	const bufB = Buffer.from(b);
	if (bufA.length !== bufB.length) {
		return false;
	}
	return timingSafeEqual(bufA, bufB);
}

export interface DodoWebhookEvent {
	type: string;
	data: {
		payment_id?: string;
		amount?: number;
		currency?: string;
		status?: string;
		metadata?: Record<string, string | undefined>;
	};
}

export function parseDodoWebhook(rawBody: string): DodoWebhookEvent {
	return JSON.parse(rawBody);
}
