import { OfframpResult, PaymentSession, Vendor } from '../types';

const DEFAULT_FX_RATE = 83.5;

function round(value: number) {
	return Math.round(value * 100) / 100;
}

export async function simulateOfframp(
	session: PaymentSession,
	vendor: Vendor
): Promise<OfframpResult> {
	const fxRate = DEFAULT_FX_RATE;
	const inrAmount = round(session.amount_usd * fxRate);

	return {
		inr_amount: inrAmount,
		fx_rate: fxRate,
		bank_reference: `ADBANK-${Date.now()}`,
		edpms_reference: vendor.edpms_irm_number ?? `EDPMS-${Date.now()}`,
		credited_at: new Date().toISOString(),
	};
}
