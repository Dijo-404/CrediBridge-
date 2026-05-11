import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';

import { validateEnv } from './lib/env.js';
import { runMigrations } from './db/migrate.js';
import { closePool, getPool } from './db/pool.js';
import { closeRedis, getRedis } from './queues/redis.js';
import { closeQueue } from './queues/payment.js';
import { registerSessionRoutes } from './routes/sessions.js';
import { registerWebhookRoutes } from './routes/webhooks.js';
import { registerVendorRoutes } from './routes/vendors.js';
import { registerOfframpRoutes } from './routes/offramp.js';

const app = Fastify({ logger: true });

app.get('/health', async () => {
	const checks: Record<string, string> = {};

	try {
		await getPool().query('SELECT 1');
		checks.postgres = 'ok';
	} catch {
		checks.postgres = 'error';
	}

	try {
		const pong = await getRedis().ping();
		checks.redis = pong === 'PONG' ? 'ok' : 'error';
	} catch {
		checks.redis = 'error';
	}

	checks.dodo = process.env.DODO_API_KEY ? 'configured' : 'mock';
	checks.solana = process.env.SOLANA_PROGRAM_ID ? 'configured' : 'mock';
	checks.razorpay = process.env.RAZORPAY_KEY_ID ? 'configured' : 'mock';

	const ok = checks.postgres === 'ok' && checks.redis === 'ok';
	return { status: ok ? 'ok' : 'degraded', ...checks };
});

const start = async () => {
	validateEnv();

	if (process.env.DATABASE_URL) {
		await runMigrations();
	} else {
		console.warn('[startup] DATABASE_URL not set — skipping migrations (in-memory mode not supported; set DATABASE_URL)');
	}

	await app.register(cors, {
		origin: process.env.FRONTEND_URL ?? true,
		credentials: true,
	});

	await registerSessionRoutes(app);
	await registerWebhookRoutes(app);
	await registerVendorRoutes(app);
	await registerOfframpRoutes(app);

	const port = Number(process.env.PORT ?? 3001);
	await app.listen({ port, host: '0.0.0.0' });
};

async function shutdown(signal: string) {
	app.log.info(`[shutdown] received ${signal}`);
	await app.close();
	await closeQueue();
	await closeRedis();
	await closePool();
	process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((err) => {
	console.error(err);
	process.exit(1);
});
