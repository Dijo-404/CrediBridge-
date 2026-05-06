'use client';

import { FormEvent, useState } from 'react';

type SubmitState =
	| { kind: 'idle' }
	| { kind: 'submitting' }
	| { kind: 'success'; vendorId: string }
	| { kind: 'error'; message: string };

export default function OnboardPage() {
	const [state, setState] = useState<SubmitState>({ kind: 'idle' });

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const data = new FormData(form);
		const payload = {
			name: String(data.get('name') ?? ''),
			gstNumber: String(data.get('gstNumber') ?? ''),
			panNumber: String(data.get('panNumber') ?? ''),
			adBankAccount: String(data.get('adBankAccount') ?? ''),
			solanaWallet: String(data.get('solanaWallet') ?? ''),
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
			setState({ kind: 'success', vendorId: json.vendor.id });
			form.reset();
		} catch (err) {
			setState({ kind: 'error', message: (err as Error).message });
		}
	}

	return (
		<main style={{ padding: '24px', fontFamily: 'sans-serif' }}>
			<h1>Vendor Onboarding</h1>
			<p>Provide compliance details to generate e-FIRC automatically.</p>

			<form
				onSubmit={onSubmit}
				style={{ display: 'grid', gap: '12px', maxWidth: '520px' }}
			>
				<label>
					Business Name
					<input type="text" name="name" required style={{ display: 'block', width: '100%' }} />
				</label>
				<label>
					GST Number
					<input type="text" name="gstNumber" required style={{ display: 'block', width: '100%' }} />
				</label>
				<label>
					PAN Number
					<input type="text" name="panNumber" required style={{ display: 'block', width: '100%' }} />
				</label>
				<label>
					AD Bank Account
					<input
						type="text"
						name="adBankAccount"
						required
						style={{ display: 'block', width: '100%' }}
					/>
				</label>
				<label>
					Solana Wallet
					<input
						type="text"
						name="solanaWallet"
						required
						style={{ display: 'block', width: '100%' }}
					/>
				</label>
				<label>
					Service Type
					<select name="serviceType" defaultValue="saas" style={{ display: 'block', width: '100%' }}>
						<option value="saas">SaaS</option>
						<option value="consulting">Consulting</option>
						<option value="ites">ITES</option>
						<option value="other">Other</option>
					</select>
				</label>
				<button type="submit" disabled={state.kind === 'submitting'}>
					{state.kind === 'submitting' ? 'Saving…' : 'Save Vendor Profile'}
				</button>
				{state.kind === 'success' && (
					<p role="status" style={{ color: 'green' }}>
						Vendor saved. ID: {state.vendorId}
					</p>
				)}
				{state.kind === 'error' && (
					<p role="alert" style={{ color: 'crimson' }}>
						{state.message}
					</p>
				)}
			</form>
		</main>
	);
}
