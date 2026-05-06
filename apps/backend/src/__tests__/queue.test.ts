import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryQueue } from '../queues/payment';

test('queue runs handler and reports completion', async () => {
	const q = new InMemoryQueue<{ value: number }>('t1', { maxAttempts: 1, baseDelayMs: 1 });
	let received = 0;
	q.process(async (job) => {
		received = job.payload.value;
	});
	const completed = new Promise<void>((resolve) => q.once('completed', () => resolve()));
	await q.add('compute', { value: 42 });
	await completed;
	assert.equal(received, 42);
});

test('queue retries failing handler with backoff up to maxAttempts', async () => {
	const q = new InMemoryQueue<{}>('t2', { maxAttempts: 3, baseDelayMs: 1 });
	let attempts = 0;
	q.process(async () => {
		attempts++;
		throw new Error('boom');
	});
	const dlq = new Promise<void>((resolve) => q.once('dead-letter', () => resolve()));
	await q.add('flaky', {});
	await dlq;
	assert.equal(attempts, 3);
	assert.equal(q.getDeadLetter().length, 1);
});

test('queue handler succeeding on retry stops the loop', async () => {
	const q = new InMemoryQueue<{}>('t3', { maxAttempts: 5, baseDelayMs: 1 });
	let attempts = 0;
	q.process(async () => {
		attempts++;
		if (attempts < 3) throw new Error('flake');
	});
	const completed = new Promise<void>((resolve) => q.once('completed', () => resolve()));
	await q.add('retry', {});
	await completed;
	assert.equal(attempts, 3);
	assert.equal(q.getDeadLetter().length, 0);
});
