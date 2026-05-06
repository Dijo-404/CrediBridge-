import { EventEmitter } from 'events';

export interface BridgeJobPayload {
	sessionId: string;
	amountUsd: number;
	purposeCode: string;
	vendorGst: string;
	vendorPan: string;
	dodoPaymentId?: string;
}

export interface QueueJob<T> {
	id: string;
	name: string;
	payload: T;
	attempts: number;
	maxAttempts: number;
	createdAt: number;
}

export type JobHandler<T> = (job: QueueJob<T>) => Promise<void>;

interface QueueOptions {
	maxAttempts?: number;
	baseDelayMs?: number;
}

/**
 * Minimal in-memory queue with exponential backoff and a dead letter list.
 * Designed to be swapped for BullMQ + Redis in production by replacing this
 * module's exports while keeping the same shape.
 */
export class InMemoryQueue<T> extends EventEmitter {
	private readonly maxAttempts: number;
	private readonly baseDelayMs: number;
	private handler?: JobHandler<T>;
	private readonly dlq: QueueJob<T>[] = [];
	private counter = 0;

	constructor(public readonly name: string, options: QueueOptions = {}) {
		super();
		this.maxAttempts = options.maxAttempts ?? 8;
		this.baseDelayMs = options.baseDelayMs ?? 50;
	}

	process(handler: JobHandler<T>): void {
		this.handler = handler;
	}

	async add(name: string, payload: T): Promise<QueueJob<T>> {
		const job: QueueJob<T> = {
			id: `${this.name}-${++this.counter}-${Date.now()}`,
			name,
			payload,
			attempts: 0,
			maxAttempts: this.maxAttempts,
			createdAt: Date.now(),
		};
		this.emit('queued', job);
		// Fire-and-forget: don't block the caller (mimics BullMQ semantics).
		void this.run(job);
		return job;
	}

	private async run(job: QueueJob<T>): Promise<void> {
		if (!this.handler) {
			this.dlq.push(job);
			this.emit('dead-letter', job, new Error('No handler registered'));
			return;
		}

		while (job.attempts < job.maxAttempts) {
			job.attempts += 1;
			try {
				await this.handler(job);
				this.emit('completed', job);
				return;
			} catch (error) {
				this.emit('failed', job, error);
				if (job.attempts >= job.maxAttempts) {
					this.dlq.push(job);
					this.emit('dead-letter', job, error);
					return;
				}
				const delay = this.baseDelayMs * Math.pow(2, job.attempts - 1);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	getDeadLetter(): ReadonlyArray<QueueJob<T>> {
		return this.dlq;
	}
}

export const paymentQueue = new InMemoryQueue<BridgeJobPayload>('payment', {
	maxAttempts: 8,
	baseDelayMs: 50,
});
