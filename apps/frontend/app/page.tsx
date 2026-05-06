import Link from 'next/link';

export default function Home() {
	return (
		<main style={{ padding: '40px', maxWidth: '720px' }}>
			<h1>CrediBridge</h1>
			<p>
				Get paid globally in seconds. Stay compliant locally, automatically.
			</p>
			<p>
				CrediBridge bridges Dodo Payments capture with a Solana settlement hop and an
				Authorized Dealer bank off-ramp so Indian software exporters receive INR with a
				valid e-FIRC in roughly 90 seconds.
			</p>
			<ul>
				<li>
					<Link href="/dashboard/onboard">Onboard a vendor</Link>
				</li>
				<li>
					<Link href="/dashboard">Open the vendor dashboard</Link>
				</li>
			</ul>
		</main>
	);
}
