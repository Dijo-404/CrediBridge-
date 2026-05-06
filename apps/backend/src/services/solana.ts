import { randomBytes } from 'crypto';
import { getSession, updateSession } from '../db/store';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const SOLANA_RPC_URL =
	process.env.SOLANA_RPC_URL ??
	(HELIUS_API_KEY
		? `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
		: 'https://api.devnet.solana.com');

/**
 * Generates a Base58-shaped signature suitable for the demo.
 * In production this is the signature returned by the Anchor program transaction.
 */
function fakeSolanaSignature(): string {
	const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
	const bytes = randomBytes(64);
	let out = '';
	for (let i = 0; i < bytes.length; i++) {
		out += alphabet[bytes[i] % alphabet.length];
	}
	return out;
}

interface SolanaRpcResponse<T> {
	jsonrpc: string;
	id: number;
	result?: T;
	error?: { code: number; message: string };
}

async function rpc<T>(method: string, params: unknown[]): Promise<T | undefined> {
	try {
		const res = await fetch(SOLANA_RPC_URL, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
		});
		if (!res.ok) return undefined;
		const json = (await res.json()) as SolanaRpcResponse<T>;
		return json.result;
	} catch {
		return undefined;
	}
}

/**
 * Wait for a transaction signature to reach finalized commitment.
 * In production this would use Helius WebSocket `signatureSubscribe`; for the
 * MVP we poll `getSignatureStatuses` to keep the dependency surface minimal.
 */
export async function waitForFinality(
	signature: string,
	timeoutMs = 30_000
): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const result = await rpc<{ value: Array<{ confirmationStatus?: string } | null> }>(
			'getSignatureStatuses',
			[[signature]]
		);
		const status = result?.value?.[0]?.confirmationStatus;
		if (status === 'finalized' || status === 'confirmed') return true;
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
	return false;
}

/**
 * Bridge a confirmed Dodo payment onto Solana. In a real deployment this would:
 *   1. Build an Anchor `deposit` instruction against the credbridge_escrow program,
 *   2. Send the transaction via the configured RPC,
 *   3. Wait for finality with `waitForFinality`,
 *   4. Mark the session `solana_transiting` -> `offramped` once finality lands.
 *
 * For the MVP we simulate steps 1–3 so the end-to-end demo runs without devnet.
 */
export async function bridgeToSolana(sessionId: string): Promise<string> {
	const session = getSession(sessionId);
	if (!session) {
		throw new Error(`Session not found: ${sessionId}`);
	}

	const signature = fakeSolanaSignature();
	updateSession(sessionId, {
		status: 'solana_transiting',
		solana_tx_signature: signature,
	});

	if (HELIUS_API_KEY) {
		await waitForFinality(signature, 5_000);
	}

	return signature;
}
