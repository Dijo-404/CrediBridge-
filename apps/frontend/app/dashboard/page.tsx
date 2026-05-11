'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
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

export default function DashboardPage() {
	const [fxRate, setFxRate] = useState(83.5);
	const [vendors, setVendors] = useState<Vendor[]>([]);
	const [selectedVendorId, setSelectedVendorId] = useState<string>('');
	const [sessions, setSessions] = useState<PaymentSession[]>([]);
	const [amountUsd, setAmountUsd] = useState('');
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
		fetch('/api/fx-rate')
			.then((r) => r.json())
			.then((d: { rate?: number }) => { if (d.rate) setFxRate(d.rate); })
			.catch(() => {});
	}, []);

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
		const inrCredit = amount * fxRate;
		return {
			amount,
			swift: swiftFee,
			cb: cbFee,
			savings: Math.max(0, swiftFee - cbFee),
			inr: inrCredit,
		};
	}, [amountUsd, fxRate]);

	const counts = useMemo(() => {
		const totalUsd = sessions.reduce((acc, s) => acc + s.amount_usd, 0);
		const settled = sessions.filter((s) => s.status === 'efirc_generated').length;
		const inFlight = sessions.length - settled;
		return { totalUsd, settled, inFlight };
	}, [sessions]);

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

	return (
		<>
			<Header pageLabel="Dashboard" />

			{/* TILE 1 — overview light */}
			<section className="bg-canvas border-b border-divider">
				<div className="mx-auto max-w-[1024px] px-6 py-[64px]">
					<div className="flex flex-col items-start justify-between gap-[24px] md:flex-row md:items-end">
						<div>
							<h1 className="text-display-md tight-hero">Vendor dashboard.</h1>
							<p className="mt-[8px] text-lead-airy text-ink-80">
								Capture cross-border payments. Watch them settle through Solana to INR.
							</p>
						</div>
						<div className="flex items-center gap-[12px]">
							{vendors.length > 0 ? (
								<>
									<label className="text-caption-strong text-ink-48">Vendor</label>
									<select
										value={selectedVendorId}
										onChange={(e) => {
											setSelectedVendorId(e.target.value);
											setActiveSessionId(null);
										}}
										className="pill-input min-w-[260px]"
									>
										{vendors.map((v) => (
											<option key={v.id} value={v.id}>
												{v.name} · {v.purpose_code}
											</option>
										))}
									</select>
								</>
							) : (
								<Link href="/dashboard/onboard" className="btn-pill">
									Onboard your first vendor
								</Link>
							)}
						</div>
					</div>

					{selectedVendor && (
						<div className="mt-[40px] grid grid-cols-2 gap-[24px] md:grid-cols-4">
							<Kpi label="Vendor" value={selectedVendor.name} sub={selectedVendor.gst_number} />
							<Kpi
								label="Volume captured"
								value={'$' + counts.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
								sub={`${sessions.length} sessions`}
							/>
							<Kpi label="In flight" value={String(counts.inFlight)} sub="Pre e-FIRC" />
							<Kpi
								label="Settled"
								value={String(counts.settled)}
								sub="With e-FIRC issued"
								highlight
							/>
						</div>
					)}
				</div>
			</section>

			{/* TILE 2 — create + compliance metadata, parchment */}
			<section className="bg-parchment border-b border-divider">
				<div className="mx-auto max-w-[1024px] px-6 py-[64px]">
					<div className="grid grid-cols-1 gap-[24px] md:grid-cols-[1.4fr_1fr]">
						<div className="utility-card">
							<div className="flex items-center justify-between">
								<h2 className="text-tagline">Create payment session</h2>
								<span className="text-caption text-ink-48">
									Purpose code{' '}
									<span className="font-semibold text-ink">
										{selectedVendor?.purpose_code ?? '—'}
									</span>
								</span>
							</div>
							<div className="mt-[20px] grid grid-cols-1 gap-[16px] sm:grid-cols-[1fr_auto] sm:items-end">
								<div>
									<label className="block text-caption-strong text-ink-48">
										Invoice amount (USD)
									</label>
									<input
										type="number"
										min="1"
										value={amountUsd}
										onChange={(e) => setAmountUsd(e.target.value)}
										className="pill-input mt-[6px]"
									/>
								</div>
								<button
									type="button"
									onClick={createSession}
									disabled={!selectedVendorId || creating}
									className="btn-pill"
								>
									{creating ? 'Creating…' : 'Create session'}
								</button>
							</div>
							{error && (
								<p className="mt-[12px] text-caption text-red-600">{error}</p>
							)}
							<div className="mt-[24px] grid grid-cols-3 gap-[16px] border-t border-hairline pt-[20px]">
								<MiniMetric label="SWIFT cost" value={`$${fx.swift.toFixed(2)}`} muted />
								<MiniMetric label="CrediBridge cost" value={`$${fx.cb.toFixed(2)}`} accent />
								<MiniMetric
									label="You save"
									value={`$${fx.savings.toFixed(2)}`}
									sub={`≈ ₹${(fx.savings * fxRate).toFixed(0)}`}
									accent
								/>
							</div>
							<p className="mt-[12px] text-fine-print text-ink-48">
								Estimated INR credit at off-ramp:{' '}
								<span className="font-semibold text-ink">
									₹{fx.inr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
								</span>{' '}
								@ {fxRate} INR/USD
							</p>
						</div>

						<div className="utility-card">
							<h2 className="text-tagline">Compliance metadata</h2>
							<p className="mt-[8px] text-caption text-ink-48">
								Injected into Dodo checkout and the on-chain escrow deposit.
							</p>
							<dl className="mt-[20px] space-y-[14px]">
								<MetaRow label="GSTIN" value={selectedVendor?.gst_number ?? '—'} />
								<MetaRow label="PAN" value={selectedVendor?.pan_number ?? '—'} />
								<MetaRow label="AD bank account" value={selectedVendor?.ad_bank_account ?? '—'} />
								<MetaRow
									label="Purpose code"
									value={selectedVendor?.purpose_code ?? '—'}
									description="RBI export classification"
								/>
								<MetaRow
									label="Solana wallet"
									value={selectedVendor?.solana_wallet ?? '—'}
									mono
								/>
							</dl>
						</div>
					</div>
				</div>
			</section>

			{/* TILE 3 — transactions, light */}
			<section className="bg-canvas border-b border-divider">
				<div className="mx-auto max-w-[1024px] px-6 py-[64px]">
					<div className="flex items-end justify-between">
						<h2 className="text-display-md tight-hero">Transactions.</h2>
						<span className="text-caption text-ink-48">Auto-refreshing every 1.5s</span>
					</div>

					{sessions.length === 0 ? (
						<EmptyState />
					) : (
						<div className="mt-[32px] grid grid-cols-1 gap-[24px] md:grid-cols-[1.4fr_1fr]">
							<div className="utility-card overflow-hidden p-0">
								<table className="w-full text-body">
									<thead>
										<tr className="border-b border-hairline text-caption-strong text-ink-48">
											<th className="px-[20px] py-[14px] text-left">Invoice</th>
											<th className="px-[20px] py-[14px] text-left">Amount</th>
											<th className="px-[20px] py-[14px] text-left">Status</th>
											<th className="px-[20px] py-[14px] text-left">e-FIRC</th>
											<th className="px-[20px] py-[14px]"></th>
										</tr>
									</thead>
									<tbody className="divide-y divide-divider">
										{sessions.map((s) => {
											const isActive = activeSession?.id === s.id;
											const settled =
												s.status === 'efirc_generated' || s.status === 'offramped';
											return (
												<tr
													key={s.id}
													onClick={() => setActiveSessionId(s.id)}
													className={
														'cursor-pointer transition ' +
														(isActive ? 'bg-parchment' : 'hover:bg-pearl')
													}
												>
													<td className="px-[20px] py-[14px] text-body-strong">
														{s.regulatory_metadata.invoice_number}
													</td>
													<td className="px-[20px] py-[14px] text-body">
														${s.amount_usd.toLocaleString()}
													</td>
													<td className="px-[20px] py-[14px]">
														<StatusChip status={s.status} />
													</td>
													<td className="px-[20px] py-[14px]">
														{settled ? (
															<a
																href={`/api/sessions/${s.id}/efirc`}
																onClick={(e) => e.stopPropagation()}
																className="link-action text-caption"
															>
																Download PDF
															</a>
														) : (
															<span className="text-ink-48 text-caption">—</span>
														)}
													</td>
													<td className="px-[20px] py-[14px] text-right">
														{s.status !== 'efirc_generated' && (
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	settle(s.id);
																}}
																className="btn-pearl"
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

							{activeSession && <SessionDetail session={activeSession} fxRate={fxRate} />}
						</div>
					)}
				</div>
			</section>

			<Footer />
		</>
	);
}

function SessionDetail({ session, fxRate }: { session: PaymentSession; fxRate: number }) {
	const inrAmount = (session.amount_usd * fxRate).toFixed(2);
	return (
		<div className="utility-card">
			<div className="flex items-center justify-between">
				<h3 className="text-tagline">Session detail</h3>
				<StatusChip status={session.status} />
			</div>
			<p className="mt-[4px] text-fine-print text-ink-48">
				Created {new Date(session.created_at).toLocaleString()}
			</p>

			<div className="mt-[24px]">
				<StatusPipeline status={session.status} />
			</div>

			<dl className="mt-[24px] space-y-[14px] border-t border-hairline pt-[20px]">
				<MetaRow label="Invoice" value={session.regulatory_metadata.invoice_number} />
				<MetaRow label="Amount (USD)" value={`$${session.amount_usd.toFixed(2)}`} />
				<MetaRow label="Estimated INR credit" value={`₹${inrAmount}`} />
				<MetaRow label="Purpose code" value={session.regulatory_metadata.purpose_code} />
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
					className="btn-pill mt-[24px] w-full"
				>
					Download e-FIRC PDF
				</a>
			)}
		</div>
	);
}

function Kpi({
	label,
	value,
	sub,
	highlight,
}: {
	label: string;
	value: string;
	sub?: string;
	highlight?: boolean;
}) {
	return (
		<div>
			<div className="text-caption-strong text-ink-48">{label}</div>
			<div
				className={
					'mt-[4px] truncate text-display-md tight-hero ' +
					(highlight ? 'text-action' : 'text-ink')
				}
			>
				{value}
			</div>
			{sub && <div className="mt-[2px] truncate text-caption text-ink-48">{sub}</div>}
		</div>
	);
}

function MiniMetric({
	label,
	value,
	sub,
	accent,
	muted,
}: {
	label: string;
	value: string;
	sub?: string;
	accent?: boolean;
	muted?: boolean;
}) {
	return (
		<div>
			<div className="text-fine-print text-ink-48">{label}</div>
			<div
				className={
					'mt-[2px] text-body-strong ' +
					(accent ? 'text-action' : muted ? 'text-ink-48' : 'text-ink')
				}
			>
				{value}
			</div>
			{sub && <div className="text-fine-print text-ink-48">{sub}</div>}
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
				<div className="text-caption-strong text-ink-48">{label}</div>
				{link ? (
					<a
						href={link}
						target="_blank"
						rel="noreferrer"
						className={
							'truncate link-action ' + (mono ? 'font-mono text-caption' : 'text-body')
						}
					>
						{truncated} ↗
					</a>
				) : (
					<div className={'truncate ' + (mono ? 'font-mono text-caption' : 'text-body')}>
						{truncated}
					</div>
				)}
				{description && (
					<div className="mt-[2px] text-fine-print text-ink-48">{description}</div>
				)}
			</div>
			{value !== '—' && <CopyButton value={value} />}
		</div>
	);
}

function EmptyState() {
	return (
		<div className="mt-[32px] utility-card flex flex-col items-center gap-[12px] py-[64px] text-center">
			<div className="grid h-[44px] w-[44px] place-items-center rounded-full border border-hairline">
				<svg
					viewBox="0 0 20 20"
					className="h-[20px] w-[20px] text-ink-48"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
				>
					<rect x="3" y="4" width="14" height="12" rx="2" />
					<path d="M3 9h14" />
				</svg>
			</div>
			<h3 className="text-tagline">No transactions yet</h3>
			<p className="max-w-[420px] text-caption text-ink-48">
				Create a payment session above. The status will move from{' '}
				<span className="font-mono">pending</span> all the way to{' '}
				<span className="font-mono">efirc_generated</span> as the webhook fires and Solana
				confirms.
			</p>
		</div>
	);
}
