import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, setProvider, Idl, BN } from '@coral-xyz/anchor';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet.js';
import { getOrCreateAssociatedTokenAccount, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
const PROGRAM_ID = process.env.SOLANA_PROGRAM_ID ?? '';
const IDL_PATH = resolve(process.cwd(), 'src/lib/credbridge_escrow.json');

let _connection: Connection | null = null;
let _keypair: Keypair | null = null;
let _program: Program | null = null;

export function getConnection(): Connection {
	if (!_connection) {
		_connection = new Connection(RPC_URL, 'confirmed');
	}
	return _connection;
}

export function getOperatorKeypair(): Keypair {
	if (!_keypair) {
		const raw = process.env.SOLANA_OPERATOR_KEYPAIR;
		if (!raw) throw new Error('SOLANA_OPERATOR_KEYPAIR env var is required');
		_keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
	}
	return _keypair;
}

export async function getProgram(): Promise<Program> {
	if (_program) return _program;
	if (!PROGRAM_ID) throw new Error('SOLANA_PROGRAM_ID env var is required');
	if (!existsSync(IDL_PATH)) {
		throw new Error(`Anchor IDL not found at ${IDL_PATH}. Run: anchor build`);
	}
	const idl = JSON.parse(await readFile(IDL_PATH, 'utf8')) as Idl;
	const connection = getConnection();
	const keypair = getOperatorKeypair();
	const wallet = new NodeWallet(keypair);
	const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
	setProvider(provider);
	// Constructor signature varies by Anchor version; cast to avoid type mismatch.
	_program = new (Program as any)(idl, new PublicKey(PROGRAM_ID), provider) as Program;
	return _program;
}

export function deriveVaultPda(vendorIdBytes: Buffer): [PublicKey, number] {
	return PublicKey.findProgramAddressSync(
		[Buffer.from('vault'), vendorIdBytes],
		new PublicKey(PROGRAM_ID)
	);
}

export async function depositToVault(
	_sessionId: string,
	vendorId: string,
	amountUsdc: bigint,
	mintAddress: string
): Promise<string> {
	const program = await getProgram();
	const keypair = getOperatorKeypair();
	const connection = getConnection();

	const vendorIdBytes = Buffer.alloc(32);
	Buffer.from(vendorId.replace(/-/g, ''), 'hex').copy(vendorIdBytes);

	const [vaultPda] = deriveVaultPda(vendorIdBytes);
	const mint = new PublicKey(mintAddress);

	const payerAta = await getOrCreateAssociatedTokenAccount(
		connection, keypair, mint, keypair.publicKey,
		false, 'confirmed', undefined, TOKEN_2022_PROGRAM_ID
	);
	const vaultAta = await getOrCreateAssociatedTokenAccount(
		connection, keypair, mint, vaultPda,
		true, 'confirmed', undefined, TOKEN_2022_PROGRAM_ID
	);

	const tx = await (program.methods as any)
		.deposit(new BN(amountUsdc.toString()))
		.accounts({
			vault: vaultPda,
			payer: keypair.publicKey,
			payerToken: payerAta.address,
			vaultToken: vaultAta.address,
			mint,
			tokenProgram: TOKEN_2022_PROGRAM_ID,
		})
		.rpc();

	return tx as string;
}

export async function initializeVaultIfNeeded(
	vendorId: string,
	purposeCode: string,
	mintAddress: string
): Promise<PublicKey> {
	const program = await getProgram();
	const keypair = getOperatorKeypair();

	const vendorIdBytes = Buffer.alloc(32);
	Buffer.from(vendorId.replace(/-/g, ''), 'hex').copy(vendorIdBytes);
	const vendorIdArray = Array.from(vendorIdBytes);

	const [vaultPda] = deriveVaultPda(vendorIdBytes);
	const mint = new PublicKey(mintAddress);

	const existing = await program.provider.connection.getAccountInfo(vaultPda);
	if (!existing) {
		await (program.methods as any)
			.initializeVault(vendorIdArray, purposeCode)
			.accounts({
				vault: vaultPda,
				mint,
				authority: keypair.publicKey,
				systemProgram: '11111111111111111111111111111111',
			})
			.rpc();
	}

	return vaultPda;
}
