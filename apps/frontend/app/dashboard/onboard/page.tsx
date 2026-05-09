'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Header } from '../../../components/Header';
import { Footer } from '../../../components/Footer';

type SubmitState =
	| { kind: 'idle' }
	| { kind: 'submitting' }
	| { kind: 'success'; vendorId: string; vendorName: string; purposeCode: string }
	| { kind: 'error'; message: string };

const SERVICE_OPTIONS = [
	{ value: 'saas', label: 'SaaS subscriptions', code: 'S1007' },
	{ value: 'consulting', label: 'Software consulting', code: 'S0802' },
	{ value: 'ites', label: 'IT-enabled services', code: 'S1102' },
	{ value: 'other', label: 'Other software exports', code: 'S0899' },
];

export default function OnboardPage() {
	const [state, setState] = useState<SubmitState>({ kind: 'idle' });
	const [serviceType, setServiceType] = useState('saas');

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const data = new FormData(form);
		const payload = {
			name: String(data.get('name') ?? '').trim(),
			gstNumber: String(data.get('gstNumber') ?? '').trim().toUpperCase(),
			panNumber: String(data.get('panNumber') ?? '').trim().toUpperCase(),
			adBankAccount: String(data.get('adBankAccount') ?? '').trim(),
			solanaWallet: String(data.get('solanaWallet') ?? '').trim(),
			serviceType,
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
			<Header pageLabel="Onboard a vendor" />

			<section className="bg-canvas">
				<div className="mx-auto max-w-[1024px] px-6 py-[64px]">
					<Link href="/dashboard" className="link-action text-caption">
						← Back to dashboard
					</Link>
					<h1 className="mt-[16px] text-display-md tight-hero">Onboard a vendor.</h1>
					<p className="mt-[8px] max-w-[680px] text-lead-airy text-ink-80">
						Compliance details are injected into every Dodo checkout and on-chain escrow
						deposit so the AD bank can issue an e-FIRC at off-ramp.
					</p>
				</div>
			</section>

			<section className="bg-parchment">
				<div className="mx-auto grid max-w-[1024px] grid-cols-1 gap-[24px] px-6 py-[40px] lg:grid-cols-[1.4fr_1fr]">
					<form onSubmit={onSubmit} className="utility-card divide-y divide-hairline p-0">
						<FormSection
							title="Business identity"
							subtitle="Public-facing name as it appears on invoices."
						>
							<Field
								label="Business name"
								name="name"
								placeholder="Acme Software Pvt Ltd"
								required
							/>
						</FormSection>

						<FormSection
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
						</FormSection>

						<FormSection
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
						</FormSection>

						<FormSection
							title="Service classification"
							subtitle="Maps to RBI export purpose codes."
						>
							<div>
								<div className="text-caption-strong text-ink-48">Service type</div>
								<div className="mt-[10px] flex flex-wrap gap-[8px]">
									{SERVICE_OPTIONS.map((opt) => {
										const selected = opt.value === serviceType;
										return (
											<button
												key={opt.value}
												type="button"
												onClick={() => setServiceType(opt.value)}
												className={
													'config-chip ' + (selected ? 'config-chip-selected' : '')
												}
												aria-pressed={selected}
											>
												<span>{opt.label}</span>
												<span className="text-fine-print text-ink-48">{opt.code}</span>
											</button>
										);
									})}
								</div>
							</div>
						</FormSection>

						<div className="flex flex-wrap items-center justify-between gap-[12px] p-[24px]">
							<button type="button" className="link-action text-caption" onClick={fillDemo}>
								Use demo data
							</button>
							<div className="flex items-center gap-[12px]">
								<Link href="/dashboard" className="link-action text-caption">
									Cancel
								</Link>
								<button
									type="submit"
									className="btn-pill"
									disabled={state.kind === 'submitting'}
								>
									{state.kind === 'submitting' ? 'Saving…' : 'Save vendor profile'}
								</button>
							</div>
						</div>
					</form>

					<aside className="space-y-[24px]">
						<div className="utility-card">
							<h2 className="text-tagline">What we do with this</h2>
							<ul className="mt-[16px] space-y-[16px]">
								<Step label="Inject metadata" body="Every Dodo checkout carries your GSTIN, PAN, and purpose code." />
								<Step label="On-chain trace" body="The Solana escrow deposit records the same metadata for audit." />
								<Step label="EDPMS reference" body="Filed automatically with the AD bank at off-ramp." />
								<Step label="e-FIRC issuance" body="Digitally signed PDF — your CA's favorite document." />
							</ul>
						</div>
						<div className="bg-tile-1 rounded-[18px] p-[24px] text-white">
							<h2 className="text-tagline">Why we ask for these</h2>
							<p className="mt-[12px] text-body text-ink-muted">
								Under FEMA, foreign revenue must route through an AD-authorized channel and be
								reconciled with EDPMS. Without GSTIN + PAN + purpose code, no e-FIRC — and no
								e-FIRC means losing 18% GST refund on every export invoice.
							</p>
						</div>
					</aside>
				</div>

				{state.kind === 'success' && (
					<div className="mx-auto max-w-[1024px] px-6 pb-[40px]">
						<div className="utility-card border-action/30">
							<div className="text-caption-strong text-action">
								{state.vendorName} onboarded
							</div>
							<div className="mt-[8px] text-body">
								Purpose code{' '}
								<span className="font-mono text-caption-strong">{state.purposeCode}</span>{' '}
								· Vendor id{' '}
								<span className="font-mono text-caption">{state.vendorId}</span>
							</div>
							<Link href="/dashboard" className="btn-pill mt-[16px]">
								Open dashboard
							</Link>
						</div>
					</div>
				)}

				{state.kind === 'error' && (
					<div className="mx-auto max-w-[1024px] px-6 pb-[40px]">
						<div className="utility-card border-red-300 bg-red-50">
							<p className="text-body text-red-700">{state.message}</p>
						</div>
					</div>
				)}
			</section>

			<Footer />
		</>
	);
}

function FormSection({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="grid gap-[20px] p-[24px] sm:grid-cols-[220px_1fr]">
			<div>
				<h3 className="text-body-strong">{title}</h3>
				{subtitle && <p className="mt-[4px] text-caption text-ink-48">{subtitle}</p>}
			</div>
			<div className="space-y-[16px]">{children}</div>
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
			<label htmlFor={name} className="text-caption-strong text-ink-48">
				{label}
				{required && <span className="ml-1 text-action">*</span>}
			</label>
			<input
				id={name}
				name={name}
				type="text"
				placeholder={placeholder}
				required={required}
				pattern={pattern}
				title={title}
				autoComplete="off"
				spellCheck={false}
				className={'pill-input mt-[6px] ' + (mono ? 'font-mono text-caption' : '')}
			/>
		</div>
	);
}

function Step({ label, body }: { label: string; body: string }) {
	return (
		<li className="flex gap-[12px]">
			<span className="mt-[2px] grid h-[24px] w-[24px] shrink-0 place-items-center rounded-full bg-action text-white text-fine-print">
				✓
			</span>
			<div>
				<div className="text-body-strong">{label}</div>
				<div className="mt-[2px] text-caption text-ink-48">{body}</div>
			</div>
		</li>
	);
}
