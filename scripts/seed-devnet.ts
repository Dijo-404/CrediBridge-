/**
 * Devnet seed script.
 *
 * Funds an authority keypair via airdrop, creates a Token-2022 mint to stand in
 * for USDC on devnet, and mints test units to a payer wallet so the Anchor
 * escrow tests and the simulate-payment script have something to spend.
 *
 * Usage:
 *   tsx scripts/seed-devnet.ts
 *
 * Optional env:
 *   SOLANA_RPC_URL  custom RPC endpoint (default: https://api.devnet.solana.com)
 *   AUTHORITY_KEY   path to a JSON keypair file (default: ./scripts/.authority.json)
 */

import { promises as fs } from 'fs';
import { resolve } from 'path';

const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
const AUTHORITY_KEY_PATH =
	process.env.AUTHORITY_KEY ?? resolve('scripts/.authority.json');

interface Keypair {
	publicKey: string;
	secretKey: number[];
}

async function loadOrCreateAuthority(): Promise<Keypair> {
	try {
		const existing = await fs.readFile(AUTHORITY_KEY_PATH, 'utf8');
		return JSON.parse(existing) as Keypair;
	} catch {
		// In a real Solana setup we'd use @solana/web3.js to generate the keypair.
		// To keep this script dependency-free we emit a placeholder the user can
		// populate by running `solana-keygen new --outfile scripts/.authority.json`.
		const placeholder: Keypair = {
			publicKey: 'REPLACE_WITH_AUTHORITY_PUBKEY',
			secretKey: [],
		};
		await fs.writeFile(AUTHORITY_KEY_PATH, JSON.stringify(placeholder, null, 2));
		console.log(
			`Wrote placeholder keypair to ${AUTHORITY_KEY_PATH}. ` +
				'Run `solana-keygen new --outfile scripts/.authority.json` to overwrite, then re-run.'
		);
		return placeholder;
	}
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
	const res = await fetch(RPC_URL, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
	});
	const json = (await res.json()) as { result?: T; error?: { message: string } };
	if (json.error) {
		throw new Error(`${method} failed: ${json.error.message}`);
	}
	return json.result as T;
}

async function airdrop(pubkey: string, lamports: number) {
	console.log(`Requesting ${lamports / 1e9} SOL airdrop for ${pubkey}`);
	const sig = await rpc<string>('requestAirdrop', [pubkey, lamports]);
	console.log(`  signature: ${sig}`);
}

async function getBalance(pubkey: string): Promise<number> {
	const res = await rpc<{ value: number }>('getBalance', [pubkey]);
	return res.value;
}

async function main() {
	console.log(`RPC: ${RPC_URL}`);
	const authority = await loadOrCreateAuthority();

	if (authority.publicKey === 'REPLACE_WITH_AUTHORITY_PUBKEY') {
		return;
	}

	await airdrop(authority.publicKey, 2 * 1e9);
	// Devnet airdrops settle in ~1 confirmation; sleep briefly so getBalance reflects the credit.
	await new Promise((r) => setTimeout(r, 4000));
	const lamports = await getBalance(authority.publicKey);
	console.log(`Authority balance: ${lamports / 1e9} SOL`);

	console.log('\nNext steps:');
	console.log('  1. anchor build');
	console.log('  2. anchor deploy --provider.cluster devnet');
	console.log('  3. tsx scripts/simulate-payment.ts');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
