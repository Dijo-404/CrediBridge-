import 'dotenv/config';
import { getPool, closePool } from './pool.js';
import { ALL_DDL } from './schema.js';

export async function runMigrations(): Promise<void> {
	const pool = getPool();
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		for (const ddl of ALL_DDL) {
			await client.query(ddl);
		}
		await client.query('COMMIT');
		console.log('[migrate] all DDL applied');
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
}

if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
	runMigrations()
		.then(() => closePool())
		.catch((err) => {
			console.error('[migrate] failed:', err);
			process.exit(1);
		});
}
