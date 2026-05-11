export const VENDORS_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS vendors (
  id                          UUID PRIMARY KEY,
  name                        TEXT NOT NULL,
  gst_number                  VARCHAR(15) NOT NULL UNIQUE,
  pan_number                  VARCHAR(10) NOT NULL,
  ad_bank_account             TEXT NOT NULL,
  solana_wallet               TEXT NOT NULL,
  purpose_code                VARCHAR(8) NOT NULL CHECK (purpose_code IN ('S1007','S0802','S0899','S1102','S1301')),
  edpms_irm_number            TEXT,
  razorpay_fund_account_id    TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS vendors_gst_idx ON vendors (gst_number);
`;

export const SESSIONS_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS payment_sessions (
  id                    UUID PRIMARY KEY,
  vendor_id             UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  dodo_session_id       TEXT,
  amount_usd            NUMERIC(14,2) NOT NULL CHECK (amount_usd > 0),
  buyer_country         VARCHAR(2),
  purpose_code          VARCHAR(8) NOT NULL,
  gst_number            VARCHAR(15) NOT NULL,
  invoice_number        TEXT NOT NULL,
  export_classification TEXT NOT NULL,
  edpms_irm_ref         TEXT,
  status                VARCHAR(32) NOT NULL CHECK (
    status IN ('pending','dodo_captured','solana_transiting','offramped','efirc_generated')
  ),
  solana_tx_signature   TEXT,
  efirc_document_url    TEXT,
  efirc_document        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_vendor_idx ON payment_sessions (vendor_id);
CREATE INDEX IF NOT EXISTS sessions_status_idx ON payment_sessions (status);
CREATE INDEX IF NOT EXISTS sessions_created_idx ON payment_sessions (created_at DESC);
`;

export const PROCESSED_WEBHOOKS_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS processed_webhooks (
  webhook_id   TEXT PRIMARY KEY,
  event_type   TEXT NOT NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export const ALL_DDL = [
	VENDORS_TABLE_DDL,
	SESSIONS_TABLE_DDL,
	PROCESSED_WEBHOOKS_TABLE_DDL,
];
