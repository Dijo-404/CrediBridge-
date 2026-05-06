'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Header } from '../../../components/Header';

type SubmitState =
	| { kind: 'idle' }
	| { kind: 'submitting' }
	| { kind: 'success'; vendorId: string; vendorName: string; purposeCode: string }
	| { kind: 'error'; message: string };

const PURPOSE_INFO: Record<string, string> = {
	saas: 'S1007 — Software services / SaaS subscriptions',
	consulting: 'S0802 — Software consulting & development',
	ites: 'S1102 — IT-enabled services (ITES)',
	other: 'S0899 — Other miscellaneous software exports',
};

export default function OnboardPage() {
	const [state, setState] = useState<SubmitState>({ kind: 'idle' });
	const [serviceType, setServiceType] = useState('saas');

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const data = new FormData(form);
		const payload = {
			name: String(data.get('name') ?? '').trim(),
			gstNumber: String(data.get('gstNumber') ?? '').trim(),
			panNumber: String(data.get('panNumber') ?? '').trim(),
			adBankAccount: String(data.get('adBankAccount') ?? '').trim(),
			solanaWallet: String(data.get('solanaWallet') ?? '').trim(),
			serviceType: String(data.get('serviceType') ?? 'other'),
		};

		setState({ kind: 'submitting' });
		try {
			const res = await fetch('/api/vendors', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const json = await res.json();
			if (!res.ok) {
				setState({ kind: 'error', message: json.error ?? 'Failed to save vendor' });
				return;
			}
			setState({
				kind: 'success',
				vendorId: json.vendor.id,
				vendorName: json.vendor.name,
				purposeCode: json.vendor.purpose_code,
			});
			form.reset();
			setServiceType('saas');
		} catch (err) {
			setState({ kind: 'error', message: (err as Error).message });
		}
	}

	function fillDemo() {
		const form = document.querySelector('form') as HTMLFormElement | null;
		if (!form) return;
		(form.elements.namedItem('name') as HTMLInputElement).value = 'Infra.so Pvt Ltd';
		(form.elements.namedItem('gstNumber') as HTMLInputElement).value = '27AABCU9603R1ZM';
		(form.elements.namedItem('panNumber') as HTMLInputElement).value = 'AABCU9603R';
		(form.elements.namedItem('adBankAccount') as HTMLInputElement).value = '00112233445566';
		(form.elements.namedItem('solanaWallet') as HTMLInputElement).value =
			'BzVaXXrCQuSamEXAMPLEpubkey4567890';
	}

	return (
		<>
			<Header />
			<main className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1.2fr_1fr]">
				<section>
					<div className="mb-6">
						<Link href="/dashboard" className="text-xs text-ink-500 hover:underline">
							← Back to dashboard
						</Link>
						<h1 className="mt-2 text-2xl font-semibold tracking-tight">Onboard a vendor</h1>
						<p className="text-sm text-ink-500">
							Compliance details are injected into every Dodo checkout and on-chain escrow deposit
							so the AD bank can issue an e-FIRC at off-ramp.
						</p>
					</div>

					<form onSubmit={onSubmit} className="card divide-y divide-ink-100">
						<Section title="Business identity" subtitle="Public-facing name as it appears on invoices.">
							<Field label="Business name" name="name" placeholder="Acme Software Pvt Ltd" required />
						</Section>

						<Section
							title="FEMA / GST identifiers"
							subtitle="Required for GST zero-rating and EDPMS reporting."
						>
							<Field
								label="GSTIN"
								name="gstNumber"
								placeholder="27AABCU9603R1ZM"
								pattern="^[0-9]{2}[A-Z0-9]{13}$"
								title="15-character GSTIN"
								required
								mono
							/>
							<Field
								label="PAN"
								name="panNumber"
								placeholder="AABCU9603R"
								pattern="^[A-Z]{5}[0-9]{4}[A-Z]$"
								title="10-character PAN"
								required
								mono
							/>
						</Section>

						<Section
							title="Banking & wallet"
							subtitle="Where INR lands and where the Solana hop is anchored."
						>
							<Field
								label="AD bank account number"
								name="adBankAccount"
								placeholder="00112233445566"
								required
							/>
							<Field
								label="Solana wallet (transit)"
								name="solanaWallet"
								placeholder="Phantom / Backpack pubkey"
								required
								mono
							/>
						</Section>

						<Section
							title="Service classification"
							subtitle="Maps to RBI export purpose codes."
						>
							<div>
								<label className="label">Service type</label>
								<select
									name="serviceType"
									value={serviceType}
									onChange={(e) => setServiceType(e.target.value)}
									className="input mt-1"
								>
									<option value="saas">SaaS subscriptions</option>
									<option value="consulting">Software consulting</option>
									<option value="ites">IT-enabled services</option>
									<option value="other">Other</option>
								</select>
								<p className="mt-2 text-[11px] text-ink-500">
									Resolves to <span className="kbd">{PURPOSE_INFO[serviceType]}</span>
								</p>
							</div>
						</Section>

						<div className="flex flex-wrap items-center justify-between gap-3 p-5">
							<button type="button" className="btn-ghost" onClick={fillDemo}>
								Use demo data
							</button>
							<div className="flex items-center gap-3">
								<Link href="/dashboard" className="btn-secondary">
									Cancel
								</Link>
								<button
									type="submit"
									className="btn-primary"
									disabled={state.kind === 'submitting'}
								>
									{state.kind === 'submitting' ? 'Saving…' : 'Save vendor profile'}
								</button>
							</div>
						</div>
					</form>

					{state.kind === 'success' && (
						<div className="mt-4 rounded-lg border border-accent-500/30 bg-accent-500/5 p-4 text-sm">
							<div className="font-semibold text-accent-600">
								{state.vendorName} onboarded
							</div>
							<div className="mt-1 text-ink-600">
								Purpose code <span className="kbd">{state.purposeCode}</span> · Vendor id{' '}
								<span className="font-mono text-xs">{state.vendorId}</span>
							</div>
							<Link href="/dashboard" className="btn-primary mt-3">
								Open dashboard
							</Link>
						</div>
					)}

					{state.kind === 'error' && (
						<div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
							{state.message}
						</div>
					)}
				</section>

				<aside className="space-y-4">
					<div className="card p-5">
						<h2 className="text-sm font-semibold text-ink-900">What we do with this</h2>
						<ul className="mt-3 space-y-3 text-xs text-ink-600">
							<Step label="Inject metadata" body="Every Dodo checkout carries your GSTIN, PAN, and purpose code." />
							<Step label="On-chain trace" body="The Solana escrow deposit records the same metadata for audit." />
							<Step label="EDPMS reference" body="Filed automatically with the AD bank at off-ramp." />
							<Step label="e-FIRC issuance" body="Digitally signed PDF — your CA's favorite document." />
						</ul>
					</div>
					<div className="card p-5 bg-ink-900 text-white">
						<h2 className="text-sm font-semibold">Why we ask for these</h2>
						<p className="mt-2 text-xs text-ink-200">
							Under FEMA, foreign revenue must route through an AD-authorized channel and be
							reconciled with EDPMS. Without GSTIN + PAN + purpose code, no e-FIRC — and no
							e-FIRC means losing 18% GST refund on every export invoice.
						</p>
					</div>
				</aside>
			</main>
		</>
	);
}

function Section({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="grid gap-4 p-5 sm:grid-cols-[200px_1fr]">
			<div>
				<h3 className="text-sm font-semibold text-ink-900">{title}</h3>
				{subtitle && <p className="mt-1 text-xs text-ink-500">{subtitle}</p>}
			</div>
			<div className="space-y-3">{children}</div>
		</div>
	);
}

function Field({
	label,
	name,
	placeholder,
	required,
	pattern,
	title,
	mono,
}: {
	label: string;
	name: string;
	placeholder?: string;
	required?: boolean;
	pattern?: string;
	title?: string;
	mono?: boolean;
}) {
	return (
		<div>
			<label className="label" htmlFor={name}>
				{label}
				{required && <span className="ml-1 text-red-500">*</span>}
			</label>
			<input
				id={name}
				name={name}
				type="text"
				placeholder={placeholder}
				required={required}
				pattern={pattern}
				title={title}
				className={'input mt-1 ' + (mono ? 'font-mono text-sm' : '')}
				autoComplete="off"
				spellCheck={false}
			/>
		</div>
	);
}

function Step({ label, body }: { label: string; body: string }) {
	return (
		<li className="flex gap-3">
			<span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink-900 text-[10px] font-semibold text-white">
				✓
			</span>
			<div>
				<div className="text-sm font-medium text-ink-900">{label}</div>
				<div className="text-[11px] leading-5 text-ink-500">{body}</div>
			</div>
		</li>
	);
}
