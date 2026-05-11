# CrediBridge

> *Stablecoin speed. Banking compliance. For India's software exporters.*

CrediBridge bridges **Dodo Payments** (fiat capture, Merchant of Record), a **Solana Token-2022 escrow vault** (on-chain settlement hop with regulatory metadata), and a **Razorpay PayOut** off-ramp — so Indian software exporters receive INR with a valid e-FIRC in roughly 90 seconds.

Solana Frontier Hackathon · Superteam India track · Dodo Payments prize.

---

## Architecture

```
Foreign client → Dodo Payments checkout
                       │ payment.succeeded (HMAC-signed webhook)
                       ▼
              CrediBridge backend (Fastify)
                       │
              BullMQ + Redis queue
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
  Solana escrow   Razorpay PayOut  e-FIRC PDF
  (Token-2022)    (INR credit)     (compliance doc)
         │
  Postgres (vendors, sessions, webhook dedup)
```

---

## Running locally

### 1. Start infrastructure

```bash
docker compose up -d        # Postgres :5432 + Redis :6379
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in .env — at minimum set DODO_WEBHOOK_SECRET for the dev server.
# All other vars have safe mock fallbacks when absent.
```

### 3. Run the backend

```bash
cd apps/backend
npm install
npm run migrate             # Apply Postgres schema (idempotent)
npm run dev                 # Fastify on :3001 with hot-reload
```

### 4. Run the frontend

```bash
cd apps/frontend
npm install
npm run dev                 # Next.js on :3000
```

### 5. End-to-end simulation

```bash
DODO_WEBHOOK_SECRET=<your_secret> npx tsx scripts/simulate-payment.ts
# Creates a vendor → session → fires a signed Dodo webhook → polls until efirc_generated → saves PDF
```

---

## Mock fallbacks (no credentials needed)

| Service | Without env var | With env var |
|---|---|---|
| Dodo Payments | Returns a `mock_*` checkout link | Calls live Dodo API |
| Solana | Generates a plausible fake Base58 signature | Sends real Anchor `deposit` instruction via Helius |
| Razorpay PayOut | Simulates INR credit at live FX rate | Issues real IMPS payout |

The application boots and all flows complete without any external credentials. Set credentials to go live.

---

## Deploying to production (Railway + Vercel)

### One-time Solana setup

```bash
# 1. Install prerequisites
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.30.1 && avm use 0.30.1

# 2. Deploy the Anchor escrow program to devnet
bash scripts/deploy-program.sh
# → prints PROGRAM_ID — set as SOLANA_PROGRAM_ID env var

# 3. Seed devnet wallets and Token-2022 USDC mint
tsx scripts/seed-devnet.ts
# → prints USDC_MINT_ADDRESS — set as USDC_MINT_ADDRESS env var
```

### Backend on Railway

1. Create a new Railway project
2. Add **Postgres** and **Redis** plugins (env vars injected automatically as `DATABASE_URL` / `REDIS_URL`)
3. Deploy this repo's `apps/backend` service (Railway detects `Dockerfile`)
4. Set all remaining env vars (see `.env.example`):

```
DODO_API_KEY
DODO_WEBHOOK_SECRET
DODO_UNIVERSAL_PRODUCT_ID
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_PAYOUT_ACCOUNT
SOLANA_PROGRAM_ID
SOLANA_OPERATOR_KEYPAIR    # JSON byte array from: solana-keygen new --outfile /dev/stdout --no-bip39-passphrase
SOLANA_RPC_URL             # https://devnet.helius-rpc.com/?api-key=<HELIUS_API_KEY>
USDC_MINT_ADDRESS
FRONTEND_URL               # Your Vercel deployment URL
```

5. The Dockerfile runs `npm run migrate` before `node dist/index.js` — schema is applied automatically on every deploy.

### Frontend on Vercel

```bash
cd apps/frontend
vercel --prod
# Set BACKEND_URL to your Railway backend URL in Vercel project settings
```

### Automated deploy (tag-based)

```bash
git tag v0.1.0
git push origin v0.1.0
# → triggers .github/workflows/deploy.yml
#   backend → Railway, frontend → Vercel
```

---

## Running tests

Tests require running Postgres and Redis:

```bash
docker compose up -d

cd apps/backend
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/credbridge \
REDIS_URL=redis://localhost:6379 \
DODO_WEBHOOK_SECRET=whsec_test \
npm run migrate && npm test
```

CI runs the same tests automatically with service containers (see `.github/workflows/backend.yml`).

---

## Repository structure

```
credbridge/
├── apps/
│   ├── backend/                 # Fastify API
│   │   ├── src/
│   │   │   ├── db/              # Postgres pool, store, schema, migrate
│   │   │   ├── lib/             # env validation, Anchor IDL (post-build)
│   │   │   ├── queues/          # BullMQ + Redis
│   │   │   ├── routes/          # sessions, vendors, webhooks, offramp
│   │   │   └── services/        # dodo, solana, anchor, razorpay, offramp, fx, efirc, settlement
│   │   └── Dockerfile
│   └── frontend/                # Next.js dashboard
│       └── app/
│           ├── api/             # BFF routes (proxies to backend)
│           └── dashboard/       # Vendor dashboard + onboarding
├── programs/escrow/             # Anchor Token-2022 escrow program
├── scripts/
│   ├── deploy-program.sh        # One-time Anchor devnet deploy
│   ├── seed-devnet.ts           # Fund wallets + create Token-2022 USDC mint
│   └── simulate-payment.ts      # End-to-end E2E test script
├── .github/workflows/           # CI (backend, frontend, anchor) + deploy
├── docker-compose.yml           # Local Postgres + Redis
└── .env.example                 # All env vars documented
```

---

## References

- [Dodo Payments docs](https://docs.dodopayments.com/introduction)
- [Solana Token Extensions](https://solana.com/solutions/token-extensions)
- [Helius RPC](https://docs.helius.dev)
- [Anchor framework](https://www.anchor-lang.com)
- [Razorpay PayOut API](https://razorpay.com/docs/razorpayx/api/)
- [e-FIRC guide (ClearTax)](https://cleartax.in/s/foreign-inward-remittance-certificate)
- [RBI PA-CB Directions](https://www.rbi.org.in)
