import { getSession, getVendor } from '../db/store';
import { settleSession } from './settlement';

export async function handleSolanaFinality(sessionId: string) {
	const session = getSession(sessionId);
	if (!session) {
		throw new Error(`Session not found: ${sessionId}`);
	}

	const vendor = getVendor(session.vendor_id);
	if (!vendor) {
		throw new Error(`Vendor not found: ${session.vendor_id}`);
	}

	return settleSession(session, vendor);
}
