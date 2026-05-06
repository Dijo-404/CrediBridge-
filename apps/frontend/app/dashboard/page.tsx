'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header';
import { CopyButton } from '../../components/CopyButton';
import {
	StatusChip,
	StatusPipeline,
	type SessionStatus,
} from '../../components/StatusPipeline';

interface Vendor {
	id: string;
	name: string;
	gst_number: string;
	pan_number: string;
	purpose_code: string;
	ad_bank_account: string;
	solana_wallet: string;
}

interface PaymentSession {
	id: string;
	vendor_id: string;
	dodo_session_id?: string;
	amount_usd: number;
	status: SessionStatus;
	regulatory_metadata: {
		invoice_number: string;
		purpose_code: string;
		gst_number: string;
		export_classification: string;
	};
	solana_tx_signature?: string;
	created_at: string;
}

const FX_RATE = 83.5;

export default function DashboardPage() {
	const [vendors, setVendors] = useState<Vendor[]>([]);
	const [selectedVendorId, setSelectedVendorId] = useState<string>('');
	const [sessions, setSessions] = useState<PaymentSession[]>([]);
	const [amountUsd, setAmountUsd] = useState('5000');
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

	const refreshVendors = useCallback(async () => {
		const res = await fetch('/api/vendors', { cache: 'no-store' });
		if (!res.ok) return;
		const json = (await res.json()) as { vendors: Vendor[] };
		setVendors(json.vendors);
		setSelectedVendorId((prev) => prev || json.vendors[0]?.id || '');
	}, []);

	const refreshSessions = useCallback(async () => {
		if (!selectedVendorId) {
			setSessions([]);
			return;
		}
		const res = await fetch(
			`/api/sessions?vendorId=${encodeURIComponent(selectedVendorId)}`,
			{ cache: 'no-store' }
		);
		if (!res.ok) return;
		const json = (await res.json()) as { sessions: PaymentSession[] };
		setSessions(json.sessions);
		setActiveSessionId((prev) => prev ?? json.sessions[0]?.id ?? null);
	}, [selectedVendorId]);

	useEffect(() => {
		refreshVendors();
	}, [refreshVendors]);

	useEffect(() => {
		refreshSessions();
		const id = setInterval(refreshSessions, 1500);
		return () => clearInterval(id);
	}, [refreshSessions]);

	const selectedVendor = vendors.find((v) => v.id === selectedVendorId);
	const activeSession = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];

	const fx = useMemo(() => {
		const amount = Number(amountUsd || 0);
		const swiftFee = amount * 0.04 + 47;
		const cbFee = amount * 0.012 + 1;
		const inrCredit = amount * FX_RATE;
		return {
			amount,
			swift: swiftFee,
			cb: cbFee,
			savings: Math.max(0, swiftFee - cbFee),
			inr: inrCredit,
		};
	}, [amountUsd]);

	async function createSession() {
		if (!selectedVendorId) {
			setError('Select a vendor first.');
			return;
		}
		const numeric = Number(amountUsd);
		if (!Number.isFinite(numeric) || numeric <= 0) {
			setError('Enter a positive USD amount.');
			return;
		}
		setError(null);
		setCreating(true);
		try {
			const res = await fetch('/api/sessions', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ vendorId: selectedVendorId, amountUsd: numeric }),
			});
			const json = await res.json();
			if (!res.ok) {
				setError(json.error ?? 'Failed to create session');
				return;
			}
			setActiveSessionId(json.session?.id ?? null);
			await refreshSessions();
		} finally {
			setCreating(false);
		}
	}

	async function settle(sessionId: string) {
		const res = await fetch(`/api/sessions/${sessionId}/settle`, { method: 'POST' });
		if (!res.ok) {
			const json = await res.json();
			setError(json.error ?? 'Settlement failed');
			return;
		}
		await refreshSessions();
	}

	const counts = useMemo(() => {
		const totalUsd = sessions.reduce((acc, s) => acc + s.amount_usd, 0);
		const settled = sessions.filter((s) => s.status === 'efirc_generated').length;
		const inFlight = sessions.length - settled;
		return { totalUsd, settled, inFlight };
	}, [sessions]);

	return (
		<>
			<Header />
			<main className="mx-auto max-w-6xl px-6 py-8">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">Vendor dashboard</h1>
						<p className="text-sm text-ink-500">
							Capture cross-border payments. Watch them settle through Solana to INR.
						</p>
					</div>
					<div className="flex items-center gap-2">
						{vendors.length > 0 ? (
							<select
								value={selectedVendorId}
								onChange={(e) => {
									setSelectedVendorId(e.target.value);
									setActiveSessionId(null);
								}}
								className="input min-w-[260px]"
							>
								{vendors.map((v) => (
									<option key={v.id} value={v.id}>
										{v.name} · {v.purpose_code}
									</option>
								))}
							</select>
						) : (
							<Link href="/dashboard/onboard" className="btn-primary">
								Onboard your first vendor
							</Link>
						)}
					</div>
				</div>

				{selectedVendor && (
					<section className="mt-6 grid gap-4 md:grid-cols-4">
						<KpiCard label="Vendor" value={selectedVendor.name} sub={selectedVendor.gst_number} />
						<KpiCard
							label="Volume captured"
							value={`$${counts.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
							sub={`${sessions.length} sessions`}
						/>
						<KpiCard label="In flight" value={String(counts.inFlight)} sub="Pre e-FIRC" />
						<KpiCard
							label="Settled"
							value={String(counts.settled)}
							sub="With e-FIRC issued"
							tone="accent"
						/>
					</section>
				)}

				<section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
					<div className="card p-5">
						<div className="flex items-center justify-between">
							<h2 className="text-sm font-semibold text-ink-900">Create payment session</h2>
							<span className="chip bg-ink-100 text-ink-600 ring-ink-200">
								Purpose code <b className="ml-1 font-semibold">{selectedVendor?.purpose_code ?? '—'}</b>
							</span>
						</div>
						<div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
							<div>
								<label className="label">Invoice amount (USD)</label>
								<input
									type="number"
									min="1"
									value={amountUsd}
									onChange={(e) => setAmountUsd(e.target.value)}
									className="input mt-1"
								/>
							</div>
							<div className="flex items-end">
								<button
									type="button"
									onClick={createSession}
									disabled={!selectedVendorId || creating}
									className="btn-primary w-full sm:w-auto"
								>
									{creating ? 'Creating…' : 'Create session'}
								</button>
							</div>
						</div>
						{error && (
							<p role="alert" className="mt-3 text-sm text-red-600">
								{error}
							</p>
						)}
						<div className="mt-5 grid gap-3 rounded-lg bg-ink-50 p-4 text-xs sm:grid-cols-3">
							<MiniMetric label="SWIFT cost" value={`$${fx.swift.toFixed(2)}`} tone="muted" />
							<MiniMetric label="CrediBridge cost" value={`$${fx.cb.toFixed(2)}`} tone="brand" />
							<MiniMetric
								label="You save"
								value={`$${fx.savings.toFixed(2)}`}
								sub={`≈ ₹${(fx.savings * FX_RATE).toFixed(0)}`}
								tone="accent"
							/>
						</div>
						<p className="mt-3 text-[11px] text-ink-500">
							Estimated INR credit at off-ramp:{' '}
							<span className="font-semibold text-ink-700">
								₹{fx.inr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
							</span>{' '}
							@ {FX_RATE} INR/USD
						</p>
					</div>

					<div className="card p-5">
						<h2 className="text-sm font-semibold text-ink-900">Compliance metadata</h2>
						<p className="mt-1 text-xs text-ink-500">
							Injected into Dodo checkout and the on-chain escrow deposit.
						</p>
						<dl className="mt-4 space-y-2 text-sm">
							<MetaRow label="GSTIN" value={selectedVendor?.gst_number ?? '—'} />
							<MetaRow label="PAN" value={selectedVendor?.pan_number ?? '—'} />
							<MetaRow label="AD bank account" value={selectedVendor?.ad_bank_account ?? '—'} />
							<MetaRow
								label="Purpose code"
								value={selectedVendor?.purpose_code ?? '—'}
								description="RBI export classification"
							/>
							<MetaRow label="Solana wallet" value={selectedVendor?.solana_wallet ?? '—'} mono />
						</dl>
					</div>
				</section>

				<section className="mt-8">
					<div className="flex items-end justify-between">
						<h2 className="text-sm font-semibold text-ink-900">Transactions</h2>
						<span className="text-xs text-ink-500">Auto-refreshing every 1.5s</span>
					</div>

					{sessions.length === 0 ? (
						<EmptyState />
					) : (
						<div className="mt-3 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
							<div className="card overflow-hidden">
								<table className="w-full text-sm">
									<thead className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
										<tr>
											<th className="px-4 py-3 font-medium">Invoice</th>
											<th className="px-4 py-3 font-medium">Amount</th>
											<th className="px-4 py-3 font-medium">Status</th>
											<th className="px-4 py-3 font-medium">e-FIRC</th>
											<th className="px-4 py-3 font-medium"></th>
										</tr>
									</thead>
									<tbody className="divide-y divide-ink-100">
										{sessions.map((s) => {
											const isActive = activeSession?.id === s.id;
											const settled =
												s.status === 'efirc_generated' || s.status === 'offramped';
											return (
												<tr
													key={s.id}
													className={
														'cursor-pointer transition ' +
														(isActive ? 'bg-brand-50/40' : 'hover:bg-ink-50')
													}
													onClick={() => setActiveSessionId(s.id)}
												>
													<td className="px-4 py-3 font-medium text-ink-900">
														{s.regulatory_metadata.invoice_number}
													</td>
													<td className="px-4 py-3 text-ink-700">
														${s.amount_usd.toLocaleString()}
													</td>
													<td className="px-4 py-3">
														<StatusChip status={s.status} />
													</td>
													<td className="px-4 py-3">
														{settled ? (
															<a
																href={`/api/sessions/${s.id}/efirc`}
																onClick={(e) => e.stopPropagation()}
																className="text-brand-700 hover:underline"
															>
																Download PDF
															</a>
														) : (
															<span className="text-ink-400">—</span>
														)}
													</td>
													<td className="px-4 py-3 text-right">
														{s.status !== 'efirc_generated' && (
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	settle(s.id);
																}}
																className="btn-secondary"
															>
																Force settle
															</button>
														)}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>

							{activeSession && <SessionDetail session={activeSession} />}
						</div>
					)}
				</section>
			</main>
		</>
	);
}

function SessionDetail({ session }: { session: PaymentSession }) {
	const inrAmount = (session.amount_usd * FX_RATE).toFixed(2);
	return (
		<div className="card p-5">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold text-ink-900">Session detail</h3>
				<StatusChip status={session.status} />
			</div>
			<p className="mt-1 text-xs text-ink-500">
				Created {new Date(session.created_at).toLocaleString()}
			</p>

			<div className="mt-4 space-y-2.5 rounded-lg bg-ink-50 p-3 text-[11px]">
				<StatusPipeline status={session.status} />
			</div>

			<dl className="mt-5 space-y-3 text-sm">
				<MetaRow label="Invoice" value={session.regulatory_metadata.invoice_number} />
				<MetaRow label="Amount (USD)" value={`$${session.amount_usd.toFixed(2)}`} />
				<MetaRow label="Estimated INR credit" value={`₹${inrAmount}`} />
				<MetaRow
					label="Purpose code"
					value={session.regulatory_metadata.purpose_code}
				/>
				<MetaRow label="GSTIN on record" value={session.regulatory_metadata.gst_number} />
				{session.dodo_session_id && (
					<MetaRow label="Dodo payment id" value={session.dodo_session_id} mono />
				)}
				{session.solana_tx_signature && (
					<MetaRow
						label="Solana tx"
						value={session.solana_tx_signature}
						mono
						link={`https://explorer.solana.com/tx/${session.solana_tx_signature}?cluster=devnet`}
					/>
				)}
			</dl>

			{(session.status === 'efirc_generated' || session.status === 'offramped') && (
				<a
					href={`/api/sessions/${session.id}/efirc`}
					className="btn-primary mt-5 w-full"
				>
					Download e-FIRC PDF
				</a>
			)}
		</div>
	);
}

function KpiCard({
	label,
	value,
	sub,
	tone,
}: {
	label: string;
	value: string;
	sub?: string;
	tone?: 'accent';
}) {
	return (
		<div className="card p-4">
			<div className="text-xs uppercase tracking-wide text-ink-500">{label}</div>
			<div
				className={
					'mt-1 truncate text-xl font-semibold tracking-tight ' +
					(tone === 'accent' ? 'text-accent-600' : 'text-ink-900')
				}
			>
				{value}
			</div>
			{sub && <div className="mt-0.5 truncate text-xs text-ink-500">{sub}</div>}
		</div>
	);
}

function MiniMetric({
	label,
	value,
	sub,
	tone,
}: {
	label: string;
	value: string;
	sub?: string;
	tone: 'accent' | 'brand' | 'muted';
}) {
	const valueClass =
		tone === 'accent'
			? 'text-accent-600'
			: tone === 'brand'
				? 'text-brand-700'
				: 'text-ink-700';
	return (
		<div>
			<div className="text-[11px] uppercase tracking-wide text-ink-500">{label}</div>
			<div className={'mt-0.5 text-base font-semibold tracking-tight ' + valueClass}>
				{value}
			</div>
			{sub && <div className="text-[11px] text-ink-500">{sub}</div>}
		</div>
	);
}

function MetaRow({
	label,
	value,
	description,
	mono,
	link,
}: {
	label: string;
	value: string;
	description?: string;
	mono?: boolean;
	link?: string;
}) {
	const truncated =
		mono && value.length > 32 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;
	return (
		<div className="flex items-start justify-between gap-3">
			<div className="min-w-0">
				<div className="label">{label}</div>
				{link ? (
					<a
						className={
							'truncate hover:underline ' + (mono ? 'font-mono text-xs' : 'text-sm')
						}
						href={link}
						target="_blank"
						rel="noreferrer"
					>
						{truncated} ↗
					</a>
				) : (
					<div className={'truncate ' + (mono ? 'font-mono text-xs' : 'text-sm')}>
						{truncated}
					</div>
				)}
				{description && (
					<div className="mt-0.5 text-[11px] text-ink-500">{description}</div>
				)}
			</div>
			{value !== '—' && <CopyButton value={value} />}
		</div>
	);
}

function EmptyState() {
	return (
		<div className="mt-3 card flex flex-col items-center gap-3 p-10 text-center">
			<div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-100">
				<svg viewBox="0 0 20 20" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
					<rect x="3" y="4" width="14" height="12" rx="2" />
					<path d="M3 9h14" />
				</svg>
			</div>
			<h3 className="text-sm font-semibold text-ink-900">No transactions yet</h3>
			<p className="max-w-sm text-xs text-ink-500">
				Create a payment session above. The status will move from{' '}
				<span className="kbd">pending</span> all the way to{' '}
				<span className="kbd">efirc_generated</span> as the webhook fires and Solana confirms.
			</p>
		</div>
	);
}
