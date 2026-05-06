import Link from 'next/link';
import { Header } from '../components/Header';

export default function Home() {
	return (
		<>
			<Header />
			<main className="mx-auto max-w-6xl px-6 py-16">
				<section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
					<div>
						<span className="chip mb-5 bg-brand-50 text-brand-700 ring-brand-200">
							<span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
							Solana Frontier × Superteam India · Dodo Payments
						</span>
						<h1 className="text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
							Get paid globally in seconds.
							<br />
							Stay compliant locally,{' '}
							<span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
								automatically
							</span>
							.
						</h1>
						<p className="mt-5 max-w-xl text-base leading-7 text-ink-600">
							CrediBridge bridges Dodo Payments capture, a Solana settlement hop, and an
							Authorized Dealer bank off-ramp — so Indian software exporters receive INR
							with a valid e-FIRC in roughly 90 seconds. RBI/FEMA happy. Founders happy.
						</p>
						<div className="mt-8 flex flex-wrap items-center gap-3">
							<Link href="/dashboard" className="btn-primary">
								Open the dashboard
							</Link>
							<Link href="/dashboard/onboard" className="btn-secondary">
								Onboard a vendor
							</Link>
							<a
								href="https://github.com"
								className="btn-ghost"
								target="_blank"
								rel="noreferrer"
							>
								View source ↗
							</a>
						</div>
						<dl className="mt-10 grid grid-cols-3 gap-6 border-t border-ink-200 pt-6">
							<Stat value="~90s" label="Settlement time" />
							<Stat value="~1.2%" label="Total fees" />
							<Stat value="100%" label="e-FIRC coverage" />
						</dl>
					</div>
					<div className="card p-6">
						<div className="mb-3 flex items-center justify-between">
							<div className="text-xs font-semibold uppercase tracking-wide text-ink-500">
								SWIFT vs CrediBridge
							</div>
							<span className="chip bg-ink-100 text-ink-700 ring-ink-200">USD 5,000 invoice</span>
						</div>
						<table className="w-full text-sm">
							<thead>
								<tr className="text-left text-xs uppercase tracking-wide text-ink-500">
									<th className="py-2 font-medium">Method</th>
									<th className="py-2 font-medium">Speed</th>
									<th className="py-2 font-medium">Fees</th>
									<th className="py-2 font-medium">e-FIRC</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-ink-100">
								<TableRow method="SWIFT wire" speed="3–5 days" fees="$200+" efirc={false} />
								<TableRow method="USDC → wallet" speed="~1s" fees="<$1" efirc={false} />
								<TableRow method="Dodo standard" speed="1–3 days" fees="$200" efirc={true} />
								<TableRow
									method={<span className="font-semibold text-ink-900">CrediBridge</span>}
									speed={<span className="font-semibold text-accent-600">~90s</span>}
									fees={<span className="font-semibold text-accent-600">$61</span>}
									efirc={true}
									highlight
								/>
							</tbody>
						</table>
						<p className="mt-4 text-xs leading-5 text-ink-500">
							A $100K/yr SaaS saves ≈ <span className="font-semibold text-ink-700">₹2.7 lakh</span>
							{' '}in fees and unlocks <span className="font-semibold text-ink-700">18% GST refund</span>
							{' '}on every export invoice.
						</p>
					</div>
				</section>

				<section className="mt-20">
					<h2 className="text-xl font-semibold tracking-tight">How a payment flows</h2>
					<div className="mt-6 grid gap-4 md:grid-cols-5">
						{FLOW_STEPS.map((s, i) => (
							<div key={s.title} className="card relative p-5">
								<div className="mb-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white">
									{i + 1}
								</div>
								<h3 className="text-sm font-semibold text-ink-900">{s.title}</h3>
								<p className="mt-1 text-xs leading-5 text-ink-500">{s.body}</p>
							</div>
						))}
					</div>
				</section>

				<section className="mt-16">
					<h2 className="text-xl font-semibold tracking-tight">Why this passes RBI</h2>
					<div className="mt-6 grid gap-4 md:grid-cols-3">
						<Compliance
							title="Merchant of Record"
							body="Dodo holds the PA-CB authorization (₹15 cr net worth), not us. Foreign payment legally lands inside an authorized aggregator."
						/>
						<Compliance
							title="Purpose codes on-chain"
							body="Every escrow deposit carries S1007/S0802 metadata. EDPMS reference filed with the AD bank at off-ramp."
						/>
						<Compliance
							title="e-FIRC in 90s"
							body="Auto-issued PDF lists FIRC number, GSTIN, PAN, AD bank reference, Solana tx — exactly what your CA wants."
						/>
					</div>
				</section>
			</main>
			<footer className="border-t border-ink-200 py-8 text-center text-xs text-ink-500">
				CrediBridge MVP · Demo runs offline by default · Plug in DODO_API_KEY + HELIUS_API_KEY for live mode
			</footer>
		</>
	);
}

function Stat({ value, label }: { value: string; label: string }) {
	return (
		<div>
			<dt className="text-xs uppercase tracking-wide text-ink-500">{label}</dt>
			<dd className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">{value}</dd>
		</div>
	);
}

function TableRow({
	method,
	speed,
	fees,
	efirc,
	highlight,
}: {
	method: React.ReactNode;
	speed: React.ReactNode;
	fees: React.ReactNode;
	efirc: boolean;
	highlight?: boolean;
}) {
	return (
		<tr className={highlight ? 'bg-accent-500/5' : ''}>
			<td className="py-2.5 text-ink-700">{method}</td>
			<td className="py-2.5 text-ink-700">{speed}</td>
			<td className="py-2.5 text-ink-700">{fees}</td>
			<td className="py-2.5">
				{efirc ? (
					<span className="text-accent-600">✓</span>
				) : (
					<span className="text-ink-400">✕</span>
				)}
			</td>
		</tr>
	);
}

function Compliance({ title, body }: { title: string; body: string }) {
	return (
		<div className="card p-5">
			<h3 className="text-sm font-semibold text-ink-900">{title}</h3>
			<p className="mt-2 text-xs leading-5 text-ink-500">{body}</p>
		</div>
	);
}

const FLOW_STEPS = [
	{ title: 'Foreign client pays', body: 'Card / PayPal / wallet via Dodo checkout.' },
	{
		title: 'Webhook captured',
		body: 'HMAC-verified payment.succeeded event hits CrediBridge.',
	},
	{
		title: 'Solana escrow',
		body: 'USDC deposited into a vendor PDA vault on Token-2022.',
	},
	{
		title: 'AD bank off-ramp',
		body: 'Programmatic INR credit with S1007 + EDPMS reference.',
	},
	{ title: 'e-FIRC issued', body: 'Digitally signed PDF in the vendor inbox.' },
];
