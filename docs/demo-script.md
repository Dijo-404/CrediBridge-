# Demo Script

Target runtime: 3 minutes.

## 0:00 to 0:20 - The hook
"Every year, Indian software companies lose billions, not to competitors, but to SWIFT fees, 3-day settlement delays, and losing GST refunds because they cannot prove foreign revenue. CrediBridge fixes all three, in 90 seconds."

## 0:20 to 0:50 - The problem
- Show a SWIFT wire receipt: fees, 4-day ETA, no purpose code.
- State the impact: "No e-FIRC means no GST refund and an 18 percent tax on every dollar earned abroad."

## 0:50 to 1:50 - The demo
1. Open the vendor dashboard.
2. Confirm vendor profile: GSTIN 27AABCU9603R1ZM, purpose code S1007.
3. Click "Create Payment Link" and enter a $5,000 invoice.
4. Show Dodo checkout URL and inspect metadata payload in the browser devtools.
5. Complete payment in Dodo test mode with card 4242 4242 4242 4242.
6. Watch the dashboard status updates:
	- Payment captured by Dodo
	- Bridging to Solana (show Helius explorer transaction)
	- Confidential transfer: amount masked on-chain
	- Off-ramping to AD bank
	- e-FIRC generated and INR credited
7. Download the e-FIRC PDF and show purpose code, EDPMS reference, and GSTIN.

## 1:50 to 2:20 - The numbers
"SWIFT: INR 3,900 in fees, 4 days, manual FIRC request. CrediBridge: INR 1,200 in fees, 90 seconds, automated e-FIRC. For a $100K per year SaaS, that is INR 2.7 lakh saved and GST refunds unlocked."

## 2:20 to 2:50 - Traction and roadmap
"We spoke to 12 Indian SaaS founders. All said e-FIRC automation alone is worth paying for. Next steps are real AD bank integration, Form 15CA or 15CB automation, and multi-vendor payout support."

## 2:50 to 3:00 - Close
"CrediBridge. Stablecoin speed. Banking compliance. For India's software exporters."
