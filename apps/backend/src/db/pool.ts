import pg from 'pg';

const { Pool } = pg;

let _pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
	if (!_pool) {
		const ssl =
			process.env.DATABASE_SSL !== 'false'
				? { rejectUnauthorized: false }
				: undefined;

		_pool = new Pool({
			connectionString: process.env.DATABASE_URL,
			ssl,
			max: 10,
			idleTimeoutMillis: 30_000,
			connectionTimeoutMillis: 5_000,
		});

		_pool.on('error', (err) => {
			console.error('[pg] unexpected pool error', err);
		});
	}
	return _pool;
}

export async function closePool(): Promise<void> {
	if (_pool) {
		await _pool.end();
		_pool = null;
	}
}
