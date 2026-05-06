'use client';

import { useMemo, useState } from 'react';

export default function DashboardPage() {
	const [amountUsd, setAmountUsd] = useState('5000');

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

	return (
		<main style={{ padding: '24px', fontFamily: 'sans-serif' }}>
			<h1>CrediBridge Dashboard</h1>
			<p>Track payment status and download e-FIRC documents.</p>

			<section style={{ marginTop: '24px' }}>
				<h2>Current Status</h2>
				<ul>
					<li>Payment captured by Dodo</li>
					<li>Bridging to Solana</li>
					<li>Off-ramping to AD bank</li>
					<li>e-FIRC generated</li>
				</ul>
			</section>

			<section style={{ marginTop: '24px' }}>
				<h2>Transaction History</h2>
				<table style={{ width: '100%', borderCollapse: 'collapse' }}>
					<thead>
						<tr>
							<th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Invoice</th>
							<th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Amount</th>
							<th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
							<th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>e-FIRC</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td style={{ padding: '8px 0' }}>INV-1001</td>
							<td style={{ padding: '8px 0' }}>$5,000.00</td>
							<td style={{ padding: '8px 0' }}>efirc_generated</td>
							<td style={{ padding: '8px 0' }}>
								<button type="button">Download</button>
							</td>
						</tr>
						<tr>
							<td style={{ padding: '8px 0' }}>INV-1002</td>
							<td style={{ padding: '8px 0' }}>$1,250.00</td>
							<td style={{ padding: '8px 0' }}>solana_transiting</td>
							<td style={{ padding: '8px 0' }}>Pending</td>
						</tr>
					</tbody>
				</table>
			</section>

			<section style={{ marginTop: '24px' }}>
				<h2>FX Savings Calculator</h2>
				<label style={{ display: 'block', marginBottom: '8px' }}>
					Invoice Amount (USD)
					<input
						type="number"
						value={amountUsd}
						onChange={(event) => setAmountUsd(event.target.value)}
						style={{ display: 'block', marginTop: '6px' }}
					/>
				</label>
				<p>SWIFT estimated fees: ${fx.swiftFee}</p>
				<p>CrediBridge estimated fees: ${fx.crediBridgeFee}</p>
				<p>Estimated savings: ${fx.savings}</p>
			</section>
		</main>
	);
}
