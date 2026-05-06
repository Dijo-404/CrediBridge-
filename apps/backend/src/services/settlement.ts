import { getSession, getVendor, updateSession } from '../db/store';
import { PaymentSession, Vendor } from '../types';
import { generateEfirc } from './efirc';
import { simulateOfframp } from './offramp';
import { bridgeToSolana } from './solana';

export async function settleSession(session: PaymentSession, vendor: Vendor) {
	if (!session.solana_tx_signature) {
		await bridgeToSolana(session.id);
	}

	const offramp = await simulateOfframp(session, vendor);
	const offramped = updateSession(session.id, { status: 'offramped' });
	const efirc = await generateEfirc(offramped, vendor, offramp);

	const finalized = updateSession(session.id, {
		status: 'efirc_generated',
		efirc_document_url: `efirc:${session.id}`,
	});

	return {
		session: finalized,
		offramp,
		efirc,
	};
}

export async function settleSessionById(sessionId: string) {
	const existing = getSession(sessionId);
	if (!existing) {
		throw new Error(`Session not found: ${sessionId}`);
	}

	if (existing.status === 'efirc_generated') {
		throw new Error(`Session already settled: ${sessionId}`);
	}

	const vendor = getVendor(existing.vendor_id);
	if (!vendor) {
		throw new Error(`Vendor not found for session: ${existing.vendor_id}`);
	}

	const session = updateSession(sessionId, { status: 'solana_transiting' });
	return settleSession(session, vendor);
}

/**
 * Webhook-driven entry point: runs after a Dodo payment.succeeded event.
 * Pre-conditions: session already exists in the store and dodo_session_id has been set.
 */
export async function handleSolanaFinality(sessionId: string) {
	return settleSessionById(sessionId);
}
