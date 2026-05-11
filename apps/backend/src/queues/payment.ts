import { Queue, Worker, Job } from 'bullmq';
import { getRedis } from './redis.js';

export interface BridgeJobPayload {
	sessionId: string;
	amountUsd: number;
	purposeCode: string;
	vendorGst: string;
	vendorPan: string;
	dodoPaymentId?: string;
}

export type JobHandler<T> = (job: Job<T>) => Promise<void>;

const QUEUE_NAME = 'payment';

let _queue: Queue<BridgeJobPayload> | null = null;
let _worker: Worker<BridgeJobPayload> | null = null;

export function getPaymentQueue(): Queue<BridgeJobPayload> {
	if (!_queue) {
		_queue = new Queue<BridgeJobPayload>(QUEUE_NAME, {
			connection: getRedis(),
			defaultJobOptions: {
				attempts: 8,
				backoff: { type: 'exponential', delay: 200 },
				removeOnComplete: { count: 1000 },
				removeOnFail: { count: 500 },
			},
		});
	}
	return _queue;
}

export function startPaymentWorker(
	handler: JobHandler<BridgeJobPayload>
): Worker<BridgeJobPayload> {
	if (_worker) return _worker;
	_worker = new Worker<BridgeJobPayload>(QUEUE_NAME, handler, {
		connection: getRedis(),
		concurrency: 5,
	});
	_worker.on('failed', (job, err) => {
		console.error(`[queue] job ${job?.id} failed:`, err.message);
	});
	return _worker;
}

export async function closeQueue(): Promise<void> {
	await _worker?.close();
	await _queue?.close();
	_worker = null;
	_queue = null;
}

export const paymentQueue = {
	add: (name: string, payload: BridgeJobPayload) =>
		getPaymentQueue().add(name, payload),
	process: (handler: JobHandler<BridgeJobPayload>) =>
		startPaymentWorker(handler),
};
