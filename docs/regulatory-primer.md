# Regulatory Primer

## FEMA and e-FIRC
Indian software exporters must route foreign revenue through an Authorized Dealer (AD) bank and receive an e-FIRC to prove compliant inward remittance. The e-FIRC is required for GST zero-rating, export benefits, and audit readiness.

## EDPMS
The Export Data Processing and Monitoring System (EDPMS) is used by AD banks to track export remittances. An EDPMS reference number is tied to the remittance record and used to issue the e-FIRC.

## Purpose codes
Purpose codes classify export revenue for RBI reporting. Common codes used in software exports:
- S1007: Software services and SaaS subscriptions
- S0802: Software consulting and development
- S0899: Other software exports
- S1102: IT-enabled services (ITES)

## PA-CB requirements
RBI PA-CB (payment aggregator, cross-border) guidelines require entities facilitating cross-border payment aggregation to meet net worth requirements. Using Dodo Payments as Merchant of Record ensures compliance with this layer while CrediBridge focuses on orchestration and settlement.

## What the MVP simulates
- AD bank off-ramp is mocked for demo purposes.
- EDPMS filing is simulated.
- e-FIRC is generated locally as a demo artifact.

## Compliance notes for demo narration
- The vendor never receives stablecoins directly.
- Purpose codes and GSTIN are injected at payment capture.
- AD bank off-ramp provides the compliant fiat leg and e-FIRC issuance.
