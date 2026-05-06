import { randomUUID } from 'crypto';
import {
  CreateSessionInput,
  CreateVendorInput,
  PaymentSession,
  Vendor,
} from '../types';

const vendors = new Map<string, Vendor>();
const sessions = new Map<string, PaymentSession>();

export function createVendor(input: CreateVendorInput): Vendor {
  const vendor: Vendor = {
    id: randomUUID(),
    ...input,
  };

  vendors.set(vendor.id, vendor);
  return vendor;
}

export function getVendor(id: string): Vendor | undefined {
  return vendors.get(id);
}

export function listVendors(): Vendor[] {
  return Array.from(vendors.values());
}

export function createSession(input: CreateSessionInput): PaymentSession {
  const session: PaymentSession = {
    id: randomUUID(),
    vendor_id: input.vendor.id,
    dodo_session_id: input.dodo_session_id,
    amount_usd: input.amount_usd,
    buyer_country: input.buyer_country,
    regulatory_metadata: {
      purpose_code: input.vendor.purpose_code,
      gst_number: input.vendor.gst_number,
      export_classification: 'software_services',
      invoice_number: input.invoice_number ?? `INV-${Date.now()}`,
      edpms_irm_ref: input.vendor.edpms_irm_number,
    },
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): PaymentSession | undefined {
  return sessions.get(id);
}

export function listSessions(vendorId?: string): PaymentSession[] {
  const all = Array.from(sessions.values()).sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
  return vendorId ? all.filter((s) => s.vendor_id === vendorId) : all;
}

export function updateSession(
  id: string,
  patch: Partial<PaymentSession>
): PaymentSession {
  const existing = sessions.get(id);
  if (!existing) {
    throw new Error(`Session not found: ${id}`);
  }

  const updated: PaymentSession = {
    ...existing,
    ...patch,
  };

  sessions.set(id, updated);
  return updated;
}
