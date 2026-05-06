'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface Vendor {
	id: string;
	name: string;
	gst_number: string;
	purpose_code: string;
}

interface PaymentSession {
	id: string;
	vendor_id: string;
	amount_usd: number;
	status:
		| 'pending'
		| 'dodo_captured'
		| 'solana_transiting'
		| 'offramped'
		| 'efirc_generated';
	regulatory_metadata: {
		invoice_number: string;
		purpose_code: string;
	};
	solana_tx_signature?: string;
	created_at: string;
}

const STATUS_LABEL: Record<PaymentSession['status'], string> = {
	pending: 'Pending',
	dodo_captured: 'Dodo Captured',
	solana_transiting: 'Bridging to Solana',
	offramped: 'AD Bank Off-ramp',
	efirc_generated: 'e-FIRC Ready',
};

export default function DashboardPage() {
	const [vendors, setVendors] = useState<Vendor[]>([]);
	const [selectedVendorId, setSelectedVendorId] = useState<string>('');
	const [sessions, setSessions] = useState<PaymentSession[]>([]);
	const [amountUsd, setAmountUsd] = useState('5000');
	const [creatingSession, setCreatingSession] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const refreshVendors = useCallback(async () => {
		const res = await fetch('/api/vendors', { cache: 'no-store' });
		if (!res.ok) return;
		const json = (await res.json()) as { vendors: Vendor[] };
		setVendors(json.vendors);
		if (!selectedVendorId && json.vendors[0]) {
			setSelectedVendorId(json.vendors[0].id);
		}
	}, [selectedVendorId]);

	const refreshSessions = useCallback(async () => {
		const url = selectedVendorId
			? `/api/sessions?vendorId=${encodeURIComponent(selectedVendorId)}`
			: '/api/sessions';
		const res = await fetch(url, { cache: 'no-store' });
		if (!res.ok) return;
		const json = (await res.json()) as { sessions: PaymentSession[] };
		setSessions(json.sessions);
	}, [selectedVendorId]);

	useEffect(() => {
		refreshVendors();
	}, [refreshVendors]);

	useEffect(() => {
		refreshSessions();
		const id = setInterval(refreshSessions, 2000);
		return () => clearInterval(id);
	}, [refreshSessions]);

	const fx = useMemo(() => {
		const amount = Number(amountUsd || 0);
		const swiftFee = amount * 0.04 + 47;
		const crediBridgeFee = amount * 0.012 + 1;
		const savings = Math.max(0, swiftFee - crediBridgeFee);
		return {
			swiftFee: swiftFee.toFixed(2),
			crediBridgeFee: crediBridgeFee.toFixed(2),
			savings: savings.toFixed(2),
		};
	}, [amountUsd]);

	async function createSession() {
		if (!selectedVendorId) {
			setError('Select a vendor first.');
			return;
		}
		const numericAmount = Number(amountUsd);
		if (!numericAmount || numericAmount <= 0) {
			setError('Enter a positive USD amount.');
			return;
		}
		setError(null);
		setCreatingSession(true);
		try {
			const res = await fetch('/api/sessions', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					vendorId: selectedVendorId,
					amountUsd: numericAmount,
				}),
			});
			const json = await res.json();
			if (!res.ok) {
				setError(json.error ?? 'Failed to create session');
				return;
			}
			await refreshSessions();
		} finally {
			setCreatingSession(false);
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

	const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

	return (
		<main style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '960px' }}>
			<h1>CrediBridge Dashboard</h1>
			<p>Track payment status and download e-FIRC documents.</p>

			<section style={{ marginTop: '24px' }}>
				<h2>Vendor</h2>
				{vendors.length === 0 ? (
					<p>
						No vendors yet. <a href="/dashboard/onboard">Onboard a vendor</a>.
					</p>
				) : (
					<label>
						Select vendor
						<select
							value={selectedVendorId}
							onChange={(e) => setSelectedVendorId(e.target.value)}
							style={{ display: 'block', marginTop: '6px', minWidth: '320px' }}
						>
							{vendors.map((v) => (
								<option key={v.id} value={v.id}>
									{v.name} — {v.gst_number} ({v.purpose_code})
								</option>
							))}
						</select>
					</label>
				)}
			</section>

			<section style={{ marginTop: '24px' }}>
				<h2>Create Payment</h2>
				<label style={{ display: 'block', marginBottom: '8px' }}>
					Invoice Amount (USD)
					<input
						type="number"
						value={amountUsd}
						onChange={(event) => setAmountUsd(event.target.value)}
						style={{ display: 'block', marginTop: '6px' }}
					/>
				</label>
				<button
					type="button"
					disabled={!selectedVendorId || creatingSession}
					onClick={createSession}
				>
					{creatingSession ? 'Creating…' : 'Create Payment Session'}
				</button>
				{error && (
					<p role="alert" style={{ color: 'crimson' }}>
						{error}
					</p>
				)}
			</section>

			<section style={{ marginTop: '24px' }}>
				<h2>Transaction History {selectedVendor ? `— ${selectedVendor.name}` : ''}</h2>
				{sessions.length === 0 ? (
					<p>No transactions yet for this vendor.</p>
				) : (
					<table style={{ width: '100%', borderCollapse: 'collapse' }}>
						<thead>
							<tr>
								<th style={cell('th')}>Invoice</th>
								<th style={cell('th')}>Amount</th>
								<th style={cell('th')}>Status</th>
								<th style={cell('th')}>Solana Tx</th>
								<th style={cell('th')}>e-FIRC</th>
								<th style={cell('th')}></th>
							</tr>
						</thead>
						<tbody>
							{sessions.map((s) => (
								<tr key={s.id}>
									<td style={cell('td')}>{s.regulatory_metadata.invoice_number}</td>
									<td style={cell('td')}>${s.amount_usd.toFixed(2)}</td>
									<td style={cell('td')}>{STATUS_LABEL[s.status]}</td>
									<td style={cell('td')}>
										{s.solana_tx_signature
											? `${s.solana_tx_signature.slice(0, 12)}…`
											: '—'}
									</td>
									<td style={cell('td')}>
										{s.status === 'efirc_generated' || s.status === 'offramped' ? (
											<a href={`/api/sessions/${s.id}/efirc`}>Download</a>
										) : (
											'Pending'
										)}
									</td>
									<td style={cell('td')}>
										{s.status !== 'efirc_generated' && (
											<button type="button" onClick={() => settle(s.id)}>
												Settle
											</button>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</section>

			<section style={{ marginTop: '24px' }}>
				<h2>FX Savings Calculator</h2>
				<p>SWIFT estimated fees: ${fx.swiftFee}</p>
				<p>CrediBridge estimated fees: ${fx.crediBridgeFee}</p>
				<p>Estimated savings: ${fx.savings}</p>
			</section>
		</main>
	);
}

function cell(kind: 'th' | 'td') {
	return {
		textAlign: 'left' as const,
		padding: '8px 6px',
		borderBottom: kind === 'th' ? '1px solid #ddd' : '1px solid #f0f0f0',
	};
}
