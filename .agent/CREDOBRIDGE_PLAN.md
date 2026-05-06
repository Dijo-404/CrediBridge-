# CrediBridge — Comprehensive Build Plan
### Solana Frontier Hackathon · Superteam India Track · Dodo Payments Prize

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Solution Architecture](#3-solution-architecture)
4. [Technical Stack](#4-technical-stack)
5. [System Design](#5-system-design)
6. [Dodo Payments Integration](#6-dodo-payments-integration)
7. [Solana Smart Contract Design](#7-solana-smart-contract-design)
8. [Regulatory Compliance Layer](#8-regulatory-compliance-layer)
9. [MVP Scope](#9-mvp-scope)
10. [Week-by-Week Build Plan](#10-week-by-week-build-plan)
11. [Demo Script](#11-demo-script)
12. [Judging Criteria Alignment](#12-judging-criteria-alignment)
13. [Risks & Mitigations](#13-risks--mitigations)
14. [Team Roles](#14-team-roles)
15. [Repository Structure](#15-repository-structure)

---

## 1. Project Overview

**CrediBridge** is an intelligent payment orchestration gateway that allows Indian software exporters — SaaS companies, freelancers, and agencies — to receive international payments at stablecoin speed while remaining fully compliant with RBI's Foreign Exchange Management Act (FEMA) and generating a valid e-FIRC (Foreign Inward Remittance Certificate).

> **Tagline:** *"Get paid globally in seconds. Stay compliant locally, automatically."*

### Why This Wins

- Solves a specific, painful, and legally consequential problem for a massive user base (India has 5M+ software exporters)
- Deep non-trivial integration with Dodo Payments (metadata injection, webhooks, MoR compliance)
- Uses Solana natively — not as a buzzword, but as the settlement layer between fiat capture and banking off-ramp
- Clear narrative: "Swift takes 3–5 days and costs 5%. CrediBridge takes 90 seconds and costs 1%."

---

## 2. Problem Statement

### The Trilemma Facing Indian Software Exporters

Indian SaaS companies and freelancers billing international clients face a painful three-way trap:

| Method | Speed | Cost | e-FIRC Generated? |
|---|---|---|---|
| SWIFT wire transfer | 3–5 business days | 3–5% + hidden FX markup | ✅ Yes |
| Stablecoin to self-hosted wallet | ~1 second | <0.01% | ❌ No |
| Dodo Payments (standard) | 1–3 days settlement | 4% + $0.40 | ✅ Yes |
| **CrediBridge** | **~90 seconds** | **~1.2%** | **✅ Yes** |

### Why the e-FIRC Matters

The **e-FIRC is not optional paperwork.** Under FEMA, Indian exporters MUST route foreign revenue through an Authorized Dealer (AD) bank channel and obtain the e-FIRC to:

- Zero-rate their GST liabilities on exported software services (saving 18% GST)
- Claim export promotion benefits under DGFT schemes
- Prove foreign revenue legitimacy during income tax assessments
- Satisfy RBI's Export Data Processing and Monitoring System (EDPMS) requirements

If an Indian freelancer or SaaS company receives USDC directly to a Phantom wallet, **they cannot generate an e-FIRC**, exposing them to tax audits and losing lakhs in GST refunds.

### The PA-CB Barrier

The RBI's September 2025 Payment Aggregator Cross-Border (PA-CB) guidelines require any entity facilitating cross-border payment aggregation to maintain ₹15 crore in net worth. This makes it impossible for a startup to build a compliant payment aggregator from scratch — but by using **Dodo Payments as the Merchant of Record**, CrediBridge can inherit this compliance layer entirely.

---

## 3. Solution Architecture

### High-Level Flow

```
[Foreign Client] 
      │
      │  Pays in USD/EUR/GBP via credit card, PayPal, local methods
      ▼
[Dodo Payments Checkout]  ← CrediBridge injects regulatory metadata
      │                       (purpose code S1007, GST number, EDPMS ref)
      │  payment.succeeded webhook (HMAC-verified)
      ▼
[CrediBridge Backend]
      │
      │  Bridges off-chain confirmation → on-chain via Helius RPC
      ▼
[Solana Smart Contract — Escrow Vault]
      │  Receives USDC (via PayPal USD / Circle USDC bridge)
      │  Applies Confidential Transfers (Token Extension) to mask amount
      ▼
[Authorized Dealer Bank API]  ← CrediBridge triggers programmatic off-ramp
      │  Injects S1007 purpose code into remittance metadata
      │  INR credited to vendor's account
      ▼
[EDPMS / AD Bank]
      │  Auto-generates digitally-signed e-FIRC
      ▼
[Indian Software Exporter] ← Receives INR + e-FIRC in ~90 seconds
```

### Key Design Decisions

**Why Dodo as fiat capture?** Dodo is the Merchant of Record, meaning it legally absorbs the global tax and compliance liability. The Indian vendor never needs to register for VAT in the EU or sales tax in the US — Dodo handles it. CrediBridge sits on top of Dodo.

**Why Solana as the transit layer?** The stablecoin hop across Solana serves two purposes: (1) near-zero settlement cost compared to SWIFT, and (2) an immutable, auditable on-chain record of the transaction that can be shown to regulators. Sub-second finality means the entire cross-border leg takes under 2 seconds.

**Why not skip Solana and go Dodo → AD bank directly?** Because then we lose the hackathon. More seriously: the Solana layer enables future composability — yield on transit funds, confidential transaction amounts, and programmable release conditions. It's the moat.

---

## 4. Technical Stack

### Backend
- **Runtime:** Node.js 20 + TypeScript
- **Framework:** Fastify (for high-throughput webhook handling)
- **Database:** PostgreSQL (transaction records, vendor profiles, compliance metadata)
- **Queue:** BullMQ + Redis (webhook processing, retry logic)
- **Hosting:** Railway or Render (fast hackathon deployment)

### Solana
- **SDK:** `@solana/web3.js` v2 + `@solana/spl-token`
- **Smart Contract:** Anchor framework (Rust)
- **Token Extensions:** Confidential Transfers, Transfer Hooks (KYC enforcement)
- **RPC:** Helius (WebSocket subscriptions for real-time tx confirmation)
- **Stablecoin:** USDC (Circle) on Solana mainnet / devnet for demo

### Frontend (Vendor Dashboard)
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Wallet:** Solana Wallet Adapter (Phantom, Backpack)
- **Charts:** Recharts (transaction history, FX savings)

### Dodo Payments
- **SDK:** `@dodopayments/node` (TypeScript SDK)
- **Features Used:** One-time payments, checkout sessions, metadata injection, webhooks
- **AI Tooling:** Sentra AI + MCP Code Mode for rapid integration scaffolding

### Compliance & Mocking (for MVP)
- **AD Bank API:** Mock server simulating Skydo/Karbon-style AD bank integration
- **EDPMS:** Simulated e-FIRC PDF generation using `pdf-lib`
- **Purpose Codes:** Hardcoded lookup table (S1007 software services, S0802 software consulting)

---

## 5. System Design

### Core Data Models

```typescript
// Vendor (Indian software exporter)
interface Vendor {
  id: string;
  name: string;
  gst_number: string;        // GSTIN — mandatory for GST zero-rating
  pan_number: string;        // PAN for FEMA compliance
  ad_bank_account: string;   // Authorized Dealer bank account
  solana_wallet: string;     // Staging wallet for transit
  purpose_code: 'S1007' | 'S0802' | 'S0899';  // RBI export purpose codes
  edpms_irm_number?: string; // Assigned by AD bank
}

// Payment Session
interface PaymentSession {
  id: string;
  vendor_id: string;
  dodo_session_id: string;       // Dodo checkout session ID
  dodo_product_id: string;
  amount_usd: number;
  buyer_country: string;
  regulatory_metadata: {
    purpose_code: string;        // Injected into Dodo metadata
    gst_number: string;
    export_classification: string;
    invoice_number: string;
  };
  status: 'pending' | 'dodo_captured' | 'solana_transiting' | 'offramped' | 'efirc_generated';
  solana_tx_signature?: string;
  efirc_document_url?: string;
  created_at: Date;
}
```

### Webhook Processing Pipeline

```
Dodo Webhook Received
        │
        ├── 1. Verify HMAC-SHA256 signature (reject if invalid)
        ├── 2. Check webhook-id for idempotency (skip if already processed)
        ├── 3. Parse event type:
        │       payment.succeeded → trigger Solana bridge
        │       payment.failed    → notify vendor, cleanup session
        │       payment.refunded  → reverse Solana flow (if possible)
        │
        └── 4. Enqueue to BullMQ for async processing
                │
                ├── Retry: exponential backoff, max 8 attempts
                └── Dead letter queue for failed events → Slack alert
```

### Solana Bridge Flow

```typescript
async function bridgeToSolana(session: PaymentSession) {
  // 1. Receive confirmation from Dodo webhook
  // 2. Convert USD amount to USDC (1:1)
  // 3. Transfer USDC to escrow vault PDA
  //    - Using Confidential Transfers extension (amount masked on-chain)
  //    - Transfer Hook enforces vendor KYC check
  // 4. Listen via Helius WebSocket for finality (~400ms)
  // 5. Trigger AD bank off-ramp API with:
  //    - Amount in USDC
  //    - Purpose code from session metadata
  //    - Vendor GST + PAN
  //    - EDPMS reference
  // 6. Receive INR credit confirmation
  // 7. Generate e-FIRC PDF
  // 8. Update session status → 'efirc_generated'
  // 9. Notify vendor via email + dashboard
}
```

---

## 6. Dodo Payments Integration

### Step 1 — Product & Checkout Setup

```typescript
import DodoPayments from '@dodopayments/node';

const dodo = new DodoPayments({ bearerToken: process.env.DODO_API_KEY });

// Create a payment session with regulatory metadata injected
async function createPaymentSession(vendor: Vendor, invoiceAmount: number) {
  const session = await dodo.payments.create({
    billing: {
      city: 'San Francisco',
      country: 'US',
      // ... buyer billing details
    },
    customer: { /* buyer details */ },
    product_cart: [{
      product_id: process.env.DODO_UNIVERSAL_PRODUCT_ID,
      quantity: 1,
    }],
    payment_link: true,
    // CRITICAL: Inject regulatory metadata here
    metadata: {
      purpose_code: vendor.purpose_code,           // e.g. "S1007"
      vendor_gst: vendor.gst_number,               // e.g. "27AABCU9603R1ZM"
      vendor_pan: vendor.pan_number,
      export_classification: 'software_services',
      credbridge_session_id: generateSessionId(),
      invoice_number: generateInvoiceNumber(),
      edpms_irm_ref: vendor.edpms_irm_number,
    },
  });

  return session.payment_link;
}
```

### Step 2 — Webhook Handler

```typescript
import { WebhookPayload } from '@dodopayments/node';

app.post('/webhooks/dodo', async (req, reply) => {
  // Verify signature — NEVER skip this
  const payload = dodo.webhooks.unwrap(
    req.rawBody,
    req.headers['webhook-signature'],
    process.env.DODO_WEBHOOK_SECRET
  );

  // Idempotency guard
  const webhookId = req.headers['webhook-id'] as string;
  const alreadyProcessed = await redis.get(`webhook:${webhookId}`);
  if (alreadyProcessed) return reply.send({ ok: true });
  await redis.set(`webhook:${webhookId}`, '1', 'EX', 86400);

  // Handle event
  if (payload.type === 'payment.succeeded') {
    const metadata = payload.data.metadata;
    await paymentQueue.add('bridge-to-solana', {
      sessionId: metadata.credbridge_session_id,
      amountUsd: payload.data.amount / 100,
      purposeCode: metadata.purpose_code,
      vendorGst: metadata.vendor_gst,
      vendorPan: metadata.vendor_pan,
    });
  }

  return reply.send({ ok: true });
});
```

### Step 3 — Sentra AI Usage (for rapid scaffolding)

During development, use Sentra via MCP Code Mode in Cursor/VS Code:

```
Prompt to Sentra:
"Create a one-time payment product for CrediBridge called 'Software Export Payment'. 
Set it to accept variable amounts. Configure a webhook for payment.succeeded events 
pointing to https://credbridge.dev/webhooks/dodo. Enable metadata passthrough."
```

Sentra auto-generates the TypeScript to call `dodo.products.create()` and `dodo.webhooks.create()` with correct parameters — saving ~2 hours of API exploration.

---

## 7. Solana Smart Contract Design

### Escrow Vault Program (Anchor)

```rust
#[program]
pub mod credbridge_escrow {
    use super::*;

    // Initialize a new escrow vault for a vendor
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        vendor_id: [u8; 32],
        purpose_code: String,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.vendor_id = vendor_id;
        vault.purpose_code = purpose_code;
        vault.authority = ctx.accounts.authority.key();
        vault.is_active = true;
        Ok(())
    }

    // Deposit USDC into escrow (called after Dodo webhook confirms)
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        // Transfer USDC from treasury → vault PDA
        // Confidential Transfer extension masks amount on-chain
        token::transfer(ctx.accounts.into_transfer_context(), amount)?;
        
        emit!(DepositEvent {
            vault: ctx.accounts.vault.key(),
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    // Release funds to AD bank off-ramp (called after finality confirmed)
    pub fn release_to_offramp(
        ctx: Context<Release>,
        offramp_address: Pubkey,
    ) -> Result<()> {
        require!(ctx.accounts.authority.is_signer, ErrorCode::Unauthorized);
        // Transfer USDC from vault → AD bank custody address
        token::transfer(ctx.accounts.into_release_context(), ctx.accounts.vault.amount)?;
        Ok(())
    }
}

#[account]
pub struct EscrowVault {
    pub vendor_id: [u8; 32],
    pub purpose_code: String,  // S1007, S0802, etc.
    pub authority: Pubkey,
    pub amount: u64,
    pub is_active: bool,
}
```

### Helius WebSocket Listener

```typescript
import { createClient } from '@helius-dev/sdk';

const helius = createClient({ apiKey: process.env.HELIUS_API_KEY });

async function waitForFinality(txSignature: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = helius.connection.onSignature(
      txSignature,
      (result) => {
        if (result.err) reject(result.err);
        else resolve();
      },
      'finalized'
    );
    setTimeout(() => reject(new Error('Timeout')), 30_000);
  });
}
```

---

## 8. Regulatory Compliance Layer

### Purpose Code Lookup Table

```typescript
const PURPOSE_CODES = {
  S1007: 'Software services — licensing, SaaS subscriptions',
  S0802: 'Software consulting and development services',
  S0899: 'Other miscellaneous software exports',
  S1102: 'IT-enabled services (ITES)',
  S1301: 'Management consulting services',
} as const;

function getPurposeCode(serviceType: string): keyof typeof PURPOSE_CODES {
  const map: Record<string, keyof typeof PURPOSE_CODES> = {
    'saas': 'S1007',
    'consulting': 'S0802',
    'ites': 'S1102',
    'other': 'S0899',
  };
  return map[serviceType] ?? 'S0899';
}
```

### Mock e-FIRC Generator (for demo)

```typescript
import { PDFDocument, StandardFonts } from 'pdf-lib';

async function generateEFIRC(session: PaymentSession, vendor: Vendor): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  
  // Header
  page.drawText('FOREIGN INWARD REMITTANCE CERTIFICATE (e-FIRC)', {
    x: 50, y: 780, size: 14, font,
  });
  
  // Certificate details
  const fields = [
    ['FIRC Number', `FIRC-${session.id.slice(0, 8).toUpperCase()}`],
    ['Date of Remittance', new Date().toLocaleDateString('en-IN')],
    ['Beneficiary Name', vendor.name],
    ['GSTIN', vendor.gst_number],
    ['Amount Received (USD)', `$${session.amount_usd.toFixed(2)}`],
    ['Amount Credited (INR)', `₹${(session.amount_usd * 83.5).toFixed(2)}`],
    ['Purpose Code', session.regulatory_metadata.purpose_code],
    ['Purpose Description', PURPOSE_CODES[session.regulatory_metadata.purpose_code]],
    ['Solana Tx Signature', session.solana_tx_signature?.slice(0, 32) + '...'],
    ['AD Bank Reference', `ADBANK-${Date.now()}`],
    ['EDPMS Acknowledged', '✓ Filed Successfully'],
  ];
  
  fields.forEach(([label, value], i) => {
    page.drawText(`${label}: ${value}`, { x: 50, y: 720 - (i * 40), size: 10, font });
  });
  
  return Buffer.from(await doc.save());
}
```

### RBI Compliance Checklist (for demo narration)

- ✅ Payment captured via AD-authorized Merchant of Record (Dodo Payments)
- ✅ Purpose code (S1007) injected into transaction metadata
- ✅ Funds routed through banking channel (Dodo → AD bank off-ramp)
- ✅ GSTIN and PAN included in remittance record
- ✅ EDPMS reference filed with AD bank
- ✅ e-FIRC issued within 90 seconds of payment

---

## 9. MVP Scope

### What's IN for the hackathon demo

| Feature | Priority | Notes |
|---|---|---|
| Vendor onboarding (GST, PAN, purpose code) | P0 | Simple form + DB |
| Dodo checkout session creation with metadata | P0 | Core integration |
| Webhook receiver (HMAC-verified, idempotent) | P0 | Non-negotiable |
| Solana USDC escrow vault (devnet) | P0 | Anchor program |
| Helius WebSocket tx confirmation | P0 | Real-time UX |
| Mock AD bank off-ramp | P0 | Simulated for demo |
| e-FIRC PDF generation | P0 | pdf-lib, looks real |
| Vendor dashboard (transaction history) | P1 | Next.js |
| FX savings calculator | P1 | SWIFT vs CrediBridge |
| Confidential Transfers (Token Extension) | P1 | Impressive to judges |
| Email notification on e-FIRC ready | P2 | Resend API |
| Real AD bank integration (Skydo/Karbon) | ❌ Post-hackathon | Too complex |

### What's OUT (explicitly scoped away)

- Form 15CA/15CB generation (too legally complex, mention as roadmap)
- Real EDPMS filing (requires RBI authorization)
- Multi-currency support beyond USD
- Mobile app

---

## 10. Week-by-Week Build Plan

> **Assumes a 3-person team. Adjust proportionally.**

### Week 1 — Foundation (Days 1–7)

**Day 1–2: Setup & Scaffolding**
- [ ] Initialize monorepo: `apps/backend`, `apps/frontend`, `programs/escrow`
- [ ] Deploy PostgreSQL + Redis on Railway
- [ ] Set up Dodo Payments account, get API keys, configure test mode
- [ ] Use Sentra MCP to scaffold initial Dodo product + webhook config
- [ ] Initialize Anchor project for escrow program

**Day 3–4: Dodo Integration Core**
- [ ] Build `POST /api/sessions/create` — creates Dodo checkout session with metadata
- [ ] Build `POST /webhooks/dodo` — HMAC verification + idempotency + BullMQ enqueue
- [ ] Write unit tests for webhook handler (use Dodo's test event simulator)
- [ ] Validate metadata passthrough: confirm `purpose_code`, `vendor_gst` in payload

**Day 5–6: Solana Escrow Program**
- [ ] Write `initialize_vault` and `deposit` instructions in Anchor
- [ ] Deploy to devnet
- [ ] Write TypeScript client to call program from backend
- [ ] Integrate Helius WebSocket listener for tx finality

**Day 7: Integration Test — End to End**
- [ ] Full flow test: Dodo test payment → webhook → Solana deposit on devnet
- [ ] Fix any signature/serialization issues
- [ ] Document any blockers

---

### Week 2 — Polish & Demo (Days 8–14)

**Day 8–9: Compliance Layer**
- [ ] Build purpose code lookup + vendor profile system
- [ ] Build mock AD bank off-ramp endpoint (simulates INR credit + EDPMS)
- [ ] Build e-FIRC PDF generator using pdf-lib
- [ ] Wire full pipeline: Solana finality → off-ramp → e-FIRC → vendor notification

**Day 10–11: Frontend Dashboard**
- [ ] Vendor onboarding form (GST, PAN, bank account, service type)
- [ ] Transaction history table with status badges
- [ ] Real-time status updates (WebSocket or polling)
- [ ] FX savings calculator (what they'd pay via SWIFT vs CrediBridge)
- [ ] e-FIRC download button per transaction

**Day 12: Token Extensions (Confidential Transfers)**
- [ ] Integrate Confidential Transfer extension into escrow vault
- [ ] Show in demo: "amount is masked on public block explorer"
- [ ] Add transfer hook for mock KYC enforcement

**Day 13: Demo Preparation**
- [ ] Record demo video (script in Section 11)
- [ ] Deploy frontend to Vercel
- [ ] Prepare block explorer links (devnet) for judge review
- [ ] Prepare slide deck (problem → solution → demo → traction → roadmap)

**Day 14: Submission**
- [ ] Submit to Colosseum global hackathon portal
- [ ] Submit to Superteam India track
- [ ] Final README with architecture diagram, setup instructions, video link

---

## 11. Demo Script

> **Target runtime: 3 minutes. Every second counts.**

**[0:00–0:20] The Hook**
> "Every year, Indian software companies lose billions — not to competitors, but to SWIFT fees, 3-day settlement delays, and losing GST refunds because they can't prove foreign revenue. CrediBridge fixes all three, in 90 seconds."

**[0:20–0:50] The Problem (show, don't tell)**
> Show a real SWIFT wire receipt: $47 fee, 4-day ETA, no purpose code. Then show: "No e-FIRC = no GST refund = 18% tax on every dollar earned abroad."

**[0:50–1:50] The Demo**
1. Open vendor dashboard — onboarded as "Infra.so, GSTIN 27AABCU9603R1ZM, Purpose Code S1007"
2. Click "Create Payment Link" — enters $5,000 invoice
3. Show Dodo checkout URL generated — inspect the metadata payload in browser devtools: `purpose_code: "S1007"`, `vendor_gst: "27AABCU9603R1ZM"`
4. Complete payment in Dodo test mode (use test card 4242 4242 4242 4242)
5. Watch the dashboard update in real time:
   - ✅ "Payment captured by Dodo"
   - ✅ "Bridging to Solana..." — show Helius block explorer, tx appearing
   - ✅ "Confidential transfer: amount masked on-chain" — show explorer, amount hidden
   - ✅ "Off-ramping to AD bank..."
   - ✅ "e-FIRC Generated — ₹4,17,500 credited"
6. Download the e-FIRC PDF, show purpose code S1007, EDPMS reference, GSTIN

**[1:50–2:20] The Numbers**
> "SWIFT: ₹3,900 in fees, 4 days, manual FIRC request. CrediBridge: ₹1,200 in fees, 90 seconds, automated e-FIRC. For a $100K/year SaaS: that's ₹2.7 lakh saved, and 18% GST refund unlocked."

**[2:20–2:50] Traction & Roadmap**
> "We've spoken to 12 Indian SaaS founders — all said e-FIRC automation alone is worth paying for. Next: real AD bank integration via Skydo API, Form 15CA/15CB auto-filing, and multi-vendor payout support."

**[2:50–3:00] Close**
> "CrediBridge. Stablecoin speed. Banking compliance. For India's software exporters."

---

## 12. Judging Criteria Alignment

| Criterion | How CrediBridge Addresses It |
|---|---|
| **Non-trivial Dodo integration** | Metadata injection with regulatory codes is unique; standard integrations don't do this. Webhook pipeline with idempotency and HMAC verification shows depth. |
| **Specific user problem** | Indian software exporters are a well-defined, large, and painful segment. Not "payments for everyone." |
| **Solana > status quo** | Clearly demonstrated: <1s vs 4 days, <$1 vs $47, automated vs manual e-FIRC. |
| **Early traction** | 12 founder interviews + letters of intent from 2–3 friendly Indian SaaS companies (get these before demo day). Even one live test transaction on mainnet wins this category. |
| **Superteam India alignment** | Directly serves India's software export economy. Addresses RBI/FEMA regulations specific to India. Named competitor example (Credible) shows judges this track. |

---

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Dodo metadata doesn't fully passthrough on webhooks | Medium | High | Test Day 1. Check `payload.data.metadata` in webhook handler. |
| Anchor program bugs on devnet deployment | Medium | High | Use `anchor test` suite extensively. Keep program logic minimal. |
| Confidential Transfers complex to implement | High | Medium | Scope as P1 — nice to have for demo. Core flow doesn't depend on it. |
| Real AD bank API unavailable | High | Low | Mock server is sufficient for demo. Be transparent with judges. |
| Team runs out of time on frontend | Medium | Medium | Use shadcn/ui pre-built components. Prioritize function over form. |
| Judges don't understand e-FIRC importance | Low | High | Explain upfront in demo: "This is mandatory under FEMA — not optional paperwork." |

---

## 14. Team Roles

### Recommended 3-Person Team

**Person 1 — Solana / Smart Contract Engineer**
- Anchor escrow program
- Token Extensions (Confidential Transfers)
- Helius WebSocket integration
- Devnet deployment

**Person 2 — Backend / Integration Engineer**
- Fastify API server
- Dodo Payments SDK integration
- Webhook pipeline (HMAC, idempotency, BullMQ)
- Mock AD bank + e-FIRC PDF generator
- PostgreSQL schema + migrations

**Person 3 — Frontend + Demo**
- Next.js vendor dashboard
- Real-time status UI
- Demo video recording and editing
- Slide deck
- Colosseum submission

> **For a 2-person team:** Person 1 takes Solana + backend webhook. Person 2 takes Dodo integration + frontend. Both contribute to demo.

---

## 15. Repository Structure

```
credbridge/
├── apps/
│   ├── backend/                    # Fastify API
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── sessions.ts     # Create Dodo checkout sessions
│   │   │   │   ├── webhooks.ts     # Dodo webhook handler
│   │   │   │   └── vendors.ts      # Vendor CRUD
│   │   │   ├── services/
│   │   │   │   ├── dodo.ts         # Dodo SDK wrapper
│   │   │   │   ├── solana.ts       # Solana bridge + Helius listener
│   │   │   │   ├── offramp.ts      # Mock AD bank off-ramp
│   │   │   │   └── efirc.ts        # e-FIRC PDF generator
│   │   │   ├── queues/
│   │   │   │   └── payment.ts      # BullMQ workers
│   │   │   └── db/
│   │   │       └── schema.ts       # PostgreSQL schema
│   │   └── package.json
│   │
│   └── frontend/                   # Next.js dashboard
│       ├── app/
│       │   ├── dashboard/
│       │   │   ├── page.tsx        # Transaction history
│       │   │   └── onboard/
│       │   │       └── page.tsx    # Vendor onboarding form
│       │   └── api/
│       │       └── sessions/
│       │           └── route.ts    # BFF layer
│       └── package.json
│
├── programs/
│   └── escrow/                     # Anchor smart contract
│       ├── src/
│       │   └── lib.rs              # EscrowVault program
│       ├── tests/
│       │   └── escrow.ts           # Anchor test suite
│       └── Anchor.toml
│
├── docs/
│   ├── architecture.png            # System diagram (for README)
│   ├── demo-script.md              # This document, Section 11
│   └── regulatory-primer.md        # e-FIRC, FEMA, PA-CB explained
│
├── scripts/
│   ├── seed-devnet.ts              # Fund devnet wallets, mint test USDC
│   └── simulate-payment.ts         # End-to-end test script
│
├── .env.example
├── README.md
└── package.json                    # Turborepo workspace root
```

---

## Appendix — Key API References

- [Dodo Payments Docs](https://docs.dodopayments.com/introduction)
- [Dodo Webhook Guide](https://docs.dodopayments.com/developer-resources/webhooks)
- [Dodo Metadata Guide](https://docs.dodopayments.com/api-reference/metadata)
- [Sentra AI](https://docs.dodopayments.com/developer-resources/sentra)
- [Solana Token Extensions](https://solana.com/solutions/token-extensions)
- [x402 Protocol on Solana](https://solana.com/x402)
- [Helius RPC Docs](https://docs.helius.dev)
- [Anchor Framework](https://www.anchor-lang.com)
- [e-FIRC Guide (ClearTax)](https://cleartax.in/s/foreign-inward-remittance-certificate)
- [RBI PA-CB Directions (Sept 2025)](https://www.rbi.org.in)

---

*Last updated: May 2026 · CrediBridge · Superteam India × Dodo Payments Track*
