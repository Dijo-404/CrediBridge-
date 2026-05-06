import { getSession, getVendor, updateSession } from '../db/store';
import { PaymentSession, Vendor } from '../types';
import { generateEfirc } from './efirc';
import { simulateOfframp } from './offramp';

export async function settleSession(session: PaymentSession, vendor: Vendor) {
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

  const session = updateSession(sessionId, { status: 'solana_transiting' });
  const vendor = getVendor(session.vendor_id);

  if (!vendor) {
    throw new Error(`Vendor not found for session: ${session.vendor_id}`);
  }

  return settleSession(session, vendor);
}
