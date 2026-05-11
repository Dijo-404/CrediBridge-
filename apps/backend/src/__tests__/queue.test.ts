import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const TEST_QUEUE = `credbridge-test-${Date.now()}`;

test('queue processes a job and calls the handler', async () => {
	const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
	const queue = new Queue(TEST_QUEUE, { connection });
	let received: unknown = null;

	const worker = new Worker(
		TEST_QUEUE,
		async (job: Job) => { received = job.data; },
		{ connection }
	);

	const done = new Promise<void>((resolve) => {
		worker.on('completed', () => resolve());
	});

	await queue.add('test', { value: 42 });
	await done;

	assert.deepEqual(received, { value: 42 });

	await worker.close();
	await queue.obliterate({ force: true });
	await queue.close();
	await connection.quit();
});

test('queue retries a failing job up to maxAttempts then marks failed', async () => {
	const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
	const queue = new Queue(`${TEST_QUEUE}-retry`, {
		connection,
		defaultJobOptions: {
			attempts: 3,
			backoff: { type: 'fixed', delay: 10 },
		},
	});
	let attempts = 0;

	const worker = new Worker(
		`${TEST_QUEUE}-retry`,
		async () => { attempts++; throw new Error('always fails'); },
		{ connection }
	);

	const done = new Promise<void>((resolve) => {
		worker.on('failed', (_job, _err, prev) => {
			if (prev === 'active') resolve();
		});
	});

	await queue.add('flaky', {});
	await done;

	assert.equal(attempts, 3);

	await worker.close();
	await queue.obliterate({ force: true });
	await queue.close();
	await connection.quit();
});
