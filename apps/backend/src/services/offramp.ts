import {
	getVendorRazorpayFundAccount,
	updateVendorRazorpayFundAccount,
} from '../db/store.js';
import { getUsdToInrRate } from './fx.js';
import { createPayout, ensureFundAccount } from './razorpay.js';
import { OfframpResult, PaymentSession, Vendor } from '../types.js';

const MOCK_MODE =
	!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET;

export async function executeOfframp(
	session: PaymentSession,
	vendor: Vendor
): Promise<OfframpResult> {
	const { rate: fxRate } = await getUsdToInrRate();

	if (MOCK_MODE) {
		console.warn(
			'[offramp] MOCK_MODE: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set — simulating off-ramp'
		);
		const inrAmount = Math.round(session.amount_usd * fxRate * 100) / 100;
		return {
			inr_amount: inrAmount,
			fx_rate: fxRate,
			bank_reference: `MOCK-ADBANK-${Date.now()}`,
			edpms_reference:
				vendor.edpms_irm_number ?? `MOCK-EDPMS-${Date.now()}`,
			credited_at: new Date().toISOString(),
		};
	}

	let fundAccountId =
		(await getVendorRazorpayFundAccount(vendor.id)) ?? undefined;

	fundAccountId = await ensureFundAccount(
		vendor.id,
		vendor.name,
		vendor.ad_bank_account,
		fundAccountId
	);

	if (!(await getVendorRazorpayFundAccount(vendor.id))) {
		await updateVendorRazorpayFundAccount(vendor.id, fundAccountId);
	}

	const inrAmount = Math.round(session.amount_usd * fxRate * 100) / 100;
	const inrAmountPaise = Math.round(inrAmount * 100);

	const payout = await createPayout(
		fundAccountId,
		inrAmountPaise,
		session.id,
		session.regulatory_metadata.purpose_code
	);

	return {
		inr_amount: payout.inrAmount,
		fx_rate: fxRate,
		bank_reference: payout.bankReference,
		edpms_reference:
			vendor.edpms_irm_number ?? `RZPX-${payout.payoutId.slice(-8)}`,
		credited_at: new Date().toISOString(),
	};
}
