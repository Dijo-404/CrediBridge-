export type PaymentStatus =
  | 'pending'
  | 'dodo_captured'
  | 'solana_transiting'
  | 'offramped'
  | 'efirc_generated';

export interface Vendor {
  id: string;
  name: string;
  gst_number: string;
  pan_number: string;
  ad_bank_account: string;
  solana_wallet: string;
  purpose_code: 'S1007' | 'S0802' | 'S0899' | 'S1102' | 'S1301';
  edpms_irm_number?: string;
}

export interface RegulatoryMetadata {
  purpose_code: string;
  gst_number: string;
  export_classification: string;
  invoice_number: string;
  edpms_irm_ref?: string;
}

export interface PaymentSession {
  id: string;
  vendor_id: string;
  dodo_session_id?: string;
  amount_usd: number;
  buyer_country?: string;
  regulatory_metadata: RegulatoryMetadata;
  status: PaymentStatus;
  solana_tx_signature?: string;
  efirc_document_url?: string;
  created_at: string;
}

export interface CreateVendorInput {
  name: string;
  gst_number: string;
  pan_number: string;
  ad_bank_account: string;
  solana_wallet: string;
  purpose_code: Vendor['purpose_code'];
  edpms_irm_number?: string;
}

export interface CreateSessionInput {
  vendor: Vendor;
  amount_usd: number;
  buyer_country?: string;
  invoice_number?: string;
  dodo_session_id?: string;
}

export interface OfframpResult {
  inr_amount: number;
  fx_rate: number;
  bank_reference: string;
  edpms_reference: string;
  credited_at: string;
}

export interface EfircDocument {
  filename: string;
  base64: string;
}
