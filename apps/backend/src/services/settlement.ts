import { getSession, getVendor, updateSession, saveEfircDocument } from '../db/store.js';
import { PaymentSession, Vendor } from '../types.js';
import { generateEfirc } from './efirc.js';
import { executeOfframp } from './offramp.js';
import { bridgeToSolana } from './solana.js';

export async function settleSession(session: PaymentSession, vendor: Vendor) {
	if (!session.solana_tx_signature) {
		await bridgeToSolana(session.id);
	}

	const latest = (await getSession(session.id))!;
	const offramp = await executeOfframp(latest, vendor);
	const offramped = await updateSession(session.id, { status: 'offramped' });
	const efirc = await generateEfirc(offramped, vendor, offramp);

	await saveEfircDocument(session.id, efirc.base64);

	const finalized = await updateSession(session.id, {
		status: 'efirc_generated',
		efirc_document_url: `efirc:${session.id}`,
	});

	return { session: finalized, offramp, efirc };
}

export async function settleSessionById(sessionId: string) {
	const existing = await getSession(sessionId);
	if (!existing) throw new Error(`Session not found: ${sessionId}`);
	if (existing.status === 'efirc_generated') {
		throw new Error(`Session already settled: ${sessionId}`);
	}

	const vendor = await getVendor(existing.vendor_id);
	if (!vendor) throw new Error(`Vendor not found for session: ${existing.vendor_id}`);

	const session = await updateSession(sessionId, { status: 'solana_transiting' });
	return settleSession(session, vendor);
}

export async function handleSolanaFinality(sessionId: string) {
	return settleSessionById(sessionId);
}
