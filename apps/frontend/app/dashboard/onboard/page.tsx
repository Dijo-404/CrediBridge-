export default function OnboardPage() {
	return (
		<main style={{ padding: '24px', fontFamily: 'sans-serif' }}>
			<h1>Vendor Onboarding</h1>
			<p>Provide compliance details to generate e-FIRC automatically.</p>

			<form style={{ display: 'grid', gap: '12px', maxWidth: '520px' }}>
				<label>
					Business Name
					<input type="text" name="name" style={{ display: 'block', width: '100%' }} />
				</label>
				<label>
					GST Number
					<input type="text" name="gstNumber" style={{ display: 'block', width: '100%' }} />
				</label>
				<label>
					PAN Number
					<input type="text" name="panNumber" style={{ display: 'block', width: '100%' }} />
				</label>
				<label>
					AD Bank Account
					<input
						type="text"
						name="adBankAccount"
						style={{ display: 'block', width: '100%' }}
					/>
				</label>
				<label>
					Solana Wallet
					<input
						type="text"
						name="solanaWallet"
						style={{ display: 'block', width: '100%' }}
					/>
				</label>
				<label>
					Service Type
					<select name="serviceType" style={{ display: 'block', width: '100%' }}>
						<option value="saas">SaaS</option>
						<option value="consulting">Consulting</option>
						<option value="ites">ITES</option>
						<option value="other">Other</option>
					</select>
				</label>
				<button type="submit">Save Vendor Profile</button>
			</form>
		</main>
	);
}
