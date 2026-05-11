const REQUIRED_PROD = [
	'DATABASE_URL',
	'REDIS_URL',
	'DODO_API_KEY',
	'DODO_WEBHOOK_SECRET',
	'RAZORPAY_KEY_ID',
	'RAZORPAY_KEY_SECRET',
	'RAZORPAY_PAYOUT_ACCOUNT',
	'SOLANA_OPERATOR_KEYPAIR',
	'SOLANA_RPC_URL',
	'SOLANA_PROGRAM_ID',
	'USDC_MINT_ADDRESS',
	'FRONTEND_URL',
];

const REQUIRED_DEV = ['DODO_WEBHOOK_SECRET'];

export function validateEnv(): void {
	const isProd = process.env.NODE_ENV === 'production';
	const required = isProd ? REQUIRED_PROD : REQUIRED_DEV;
	const missing = required.filter((k) => !process.env[k]);

	if (missing.length > 0) {
		const msg = `Missing required env vars: ${missing.join(', ')}`;
		if (isProd) {
			throw new Error(msg);
		} else {
			console.warn(`[env] WARNING: ${msg} — running in degraded/mock mode`);
		}
	}
}
