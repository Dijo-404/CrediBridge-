import IORedis from 'ioredis';

let _connection: IORedis | null = null;

export function getRedis(): IORedis {
	if (!_connection) {
		_connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
			maxRetriesPerRequest: null,
		});
		_connection.on('error', (err) => {
			console.error('[redis] connection error', err);
		});
	}
	return _connection;
}

export async function closeRedis(): Promise<void> {
	if (_connection) {
		await _connection.quit();
		_connection = null;
	}
}
