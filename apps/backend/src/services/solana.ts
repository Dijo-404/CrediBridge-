import { getSession, updateSession } from '../db/store.js';
import { getConnection } from './anchor.js';

const USDC_DECIMALS = 6;
const MOCK_MODE = !process.env.SOLANA_PROGRAM_ID || !process.env.SOLANA_OPERATOR_KEYPAIR;

function fakeSolanaSignature(): string {
	const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
	const { randomBytes } = require('crypto');
	const bytes = randomBytes(64) as Buffer;
	return Array.from(bytes).map((b: number) => alphabet[b % alphabet.length]).join('');
}

export async function waitForFinality(
	signature: string,
	timeoutMs = 30_000
): Promise<boolean> {
	const connection = getConnection();
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const statuses = await connection.getSignatureStatuses([signature]);
		const status = statuses.value[0]?.confirmationStatus;
		if (status === 'finalized' || status === 'confirmed') return true;
		await new Promise((r) => setTimeout(r, 1000));
	}
	return false;
}

export async function bridgeToSolana(sessionId: string): Promise<string> {
	const session = await getSession(sessionId);
	if (!session) throw new Error(`Session not found: ${sessionId}`);

	let signature: string;

	if (MOCK_MODE) {
		console.warn('[solana] MOCK_MODE: SOLANA_PROGRAM_ID or SOLANA_OPERATOR_KEYPAIR not set — using fake signature');
		signature = fakeSolanaSignature();
	} else {
		const { depositToVault, initializeVaultIfNeeded } = await import('./anchor.js');
		const mintAddress = process.env.USDC_MINT_ADDRESS;
		if (!mintAddress) throw new Error('USDC_MINT_ADDRESS env var is required for real Solana');

		await initializeVaultIfNeeded(
			session.vendor_id,
			session.regulatory_metadata.purpose_code,
			mintAddress
		);

		const amountUsdc = BigInt(Math.round(session.amount_usd * 10 ** USDC_DECIMALS));
		signature = await depositToVault(sessionId, session.vendor_id, amountUsdc, mintAddress);

		if (process.env.HELIUS_API_KEY) {
			await waitForFinality(signature, 30_000);
		}
	}

	await updateSession(sessionId, {
		status: 'solana_transiting',
		solana_tx_signature: signature,
	});

	return signature;
}
