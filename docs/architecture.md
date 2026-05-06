# Architecture Diagram

This diagram can be exported to an image for the README if needed.

```mermaid
flowchart TD
  Client[Foreign client] --> Checkout[Dodo Payments checkout]
  Checkout -->|payment.succeeded webhook| Backend[CrediBridge backend]
  Backend --> Solana[Solana escrow vault]
  Solana --> Offramp[AD bank off-ramp]
  Offramp --> EDPMS[EDPMS + e-FIRC issuance]
  EDPMS --> Vendor[Indian software exporter]
  Backend --> Dashboard[Vendor dashboard]
  Backend --> Notify[Email or webhook notifications]
```

Notes:
- Dodo captures payment and sends signed webhooks.
- Metadata injected at capture includes purpose code, GSTIN, PAN, and invoice number.
- Solana settlement provides an auditable on-chain hop before fiat off-ramp.
- AD bank off-ramp issues the e-FIRC used for GST and audit compliance.
