# Deployment Notes

## Backend
Suggested platform: Railway or Render.

Required environment variables:
- DODO_API_KEY
- DODO_WEBHOOK_SECRET
- DODO_UNIVERSAL_PRODUCT_ID
- DATABASE_URL
- REDIS_URL
- HELIUS_API_KEY
- SOLANA_RPC_URL

Webhook endpoint:
- Configure Dodo to send webhooks to https://<backend-host>/webhooks/dodo

## Frontend
Suggested platform: Vercel.

Required environment variables:
- BACKEND_URL (example: https://<backend-host>)

## Demo checklist
- Verify webhook signature validation in the backend.
- Confirm metadata passthrough in Dodo webhook payload.
- Record a short screen capture of the dashboard and status updates.
- Prepare a Helius explorer link for the Solana transaction.
