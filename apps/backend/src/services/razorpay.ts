import Razorpay from 'razorpay';

let _client: Razorpay | null = null;

function getRazorpay(): Razorpay {
	if (!_client) {
		const keyId = process.env.RAZORPAY_KEY_ID;
		const keySecret = process.env.RAZORPAY_KEY_SECRET;
		if (!keyId || !keySecret) {
			throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required');
		}
		_client = new Razorpay({ key_id: keyId, key_secret: keySecret });
	}
	return _client;
}

export interface RazorpayPayout {
	payoutId: string;
	bankReference: string;
	status: string;
	inrAmount: number;
	fundAccountId: string;
}

export async function ensureFundAccount(
	vendorId: string,
	vendorName: string,
	adBankAccount: string,
	existingFundAccountId?: string | null
): Promise<string> {
	if (existingFundAccountId) return existingFundAccountId;

	const rp = getRazorpay();
	const accountNumber = process.env.RAZORPAY_PAYOUT_ACCOUNT;
	if (!accountNumber) throw new Error('RAZORPAY_PAYOUT_ACCOUNT env var is required');

	const rpa = rp as any;
	const contact = await rpa.contacts.create({
		name: vendorName,
		type: 'vendor',
		reference_id: vendorId,
	});

	const fundAccount = await rpa.fundAccount.create({
		contact_id: contact.id,
		account_type: 'bank_account',
		bank_account: {
			name: vendorName,
			ifsc: process.env.VENDOR_BANK_IFSC ?? 'ICIC0000001',
			account_number: adBankAccount,
		},
	});

	return fundAccount.id as string;
}

export async function createPayout(
	fundAccountId: string,
	inrAmountPaise: number,
	sessionId: string,
	purposeCode: string
): Promise<RazorpayPayout> {
	const rpa = getRazorpay() as any;
	const accountNumber = process.env.RAZORPAY_PAYOUT_ACCOUNT;
	if (!accountNumber) throw new Error('RAZORPAY_PAYOUT_ACCOUNT env var is required');

	const payout = await rpa.payouts.create({
		account_number: accountNumber,
		fund_account_id: fundAccountId,
		amount: inrAmountPaise,
		currency: 'INR',
		mode: 'IMPS',
		purpose: 'vendor_advance',
		queue_if_low_balance: true,
		reference_id: sessionId,
		narration: `CrediBridge-${purposeCode}-${sessionId.slice(0, 8)}`,
		notes: {
			purpose_code: purposeCode,
			credbridge_session_id: sessionId,
		},
	});

	return {
		payoutId: payout.id as string,
		bankReference: (payout.utr ?? payout.id) as string,
		status: payout.status as string,
		inrAmount: inrAmountPaise / 100,
		fundAccountId,
	};
}
