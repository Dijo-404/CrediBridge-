import Link from 'next/link';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export default function Home() {
	return (
		<>
			<Header pageLabel="CrediBridge" />

			{/* HERO TILE — light, the manifesto */}
			<section className="tile-light text-center">
				<div className="mx-auto max-w-[820px]">
					<h1 className="text-hero-display tight-hero">
						Stablecoin speed.
						<br />
						<span className="text-action">Banking compliance.</span>
					</h1>
					<p className="mt-[24px] text-lead">
						Cross-border payments for Indian software exporters — captured by Dodo,
						settled on Solana, off-ramped to INR with a valid e-FIRC. In about 90 seconds.
					</p>
					<div className="mt-[40px] flex items-center justify-center gap-[16px]">
						<Link href="/dashboard" className="btn-pill">Open dashboard</Link>
						<Link href="/dashboard/onboard" className="btn-pill-ghost">Onboard a vendor</Link>
					</div>
				</div>
			</section>

			{/* DARK TILE — the comparison */}
			<section className="tile-dark">
				<div className="mx-auto max-w-[1024px]">
					<div className="text-center">
						<h2 className="text-display-lg">The math is unambiguous.</h2>
						<p className="mt-[16px] text-lead-airy text-ink-muted">
							A USD 5,000 invoice, four ways.
						</p>
					</div>
					<div className="mt-[64px] grid grid-cols-1 gap-[2px] md:grid-cols-4">
						<CompareCard method="SWIFT wire" speed="3–5 days" fees="$200+" efirc="Yes" />
						<CompareCard method="USDC → wallet" speed="~1 second" fees="<$1" efirc="No" />
						<CompareCard method="Dodo standard" speed="1–3 days" fees="$200" efirc="Yes" />
						<CompareCard
							method="CrediBridge"
							speed="~90 seconds"
							fees="$61"
							efirc="Yes"
							highlight
						/>
					</div>
					<p className="mt-[40px] text-center text-caption text-ink-muted">
						A $100K/year SaaS saves ≈ ₹2.7 lakh in fees and unlocks the 18% GST refund on
						every export invoice.
					</p>
				</div>
			</section>

			{/* PARCHMENT TILE — the flow */}
			<section className="tile-parchment">
				<div className="mx-auto max-w-[1024px]">
					<div className="text-center">
						<h2 className="text-display-lg">How a payment flows.</h2>
						<p className="mt-[16px] text-lead-airy">
							Five hops. Each one carries the regulatory metadata forward.
						</p>
					</div>
					<ol className="mt-[64px] grid grid-cols-1 gap-[24px] md:grid-cols-5">
						{FLOW.map((s, i) => (
							<li key={s.title} className="utility-card">
								<div className="text-caption-strong text-action">{`0${i + 1}`}</div>
								<div className="mt-2 text-body-strong">{s.title}</div>
								<p className="mt-2 text-caption text-ink-80">{s.body}</p>
							</li>
						))}
					</ol>
				</div>
			</section>

			{/* DARK TILE — compliance pillars */}
			<section className="tile-dark-2">
				<div className="mx-auto max-w-[1024px]">
					<div className="grid grid-cols-1 items-start gap-[48px] md:grid-cols-2">
						<div>
							<h2 className="text-display-lg">Why this passes RBI.</h2>
							<p className="mt-[16px] text-lead-airy text-ink-muted">
								Three load-bearing decisions, each one auditable end to end.
							</p>
							<Link href="/dashboard" className="btn-pill-ghost-on-dark mt-[32px]">
								See it in motion
							</Link>
						</div>
						<div className="space-y-[24px]">
							<Pillar
								title="Merchant of Record"
								body="Dodo holds the PA-CB authorization. Foreign payment legally lands inside an authorized aggregator, not a wallet."
							/>
							<Pillar
								title="Purpose codes on-chain"
								body="Every escrow deposit carries S1007 / S0802 metadata. The Solana hop is the audit trail."
							/>
							<Pillar
								title="e-FIRC in 90 seconds"
								body="Auto-issued PDF lists FIRC number, GSTIN, PAN, AD bank reference, and the Solana tx — exactly what your CA wants."
							/>
						</div>
					</div>
				</div>
			</section>

			{/* LIGHT TILE — final CTA */}
			<section className="tile-light text-center">
				<div className="mx-auto max-w-[680px]">
					<h2 className="text-display-md tight-hero">Get paid globally in seconds.</h2>
					<p className="mt-[12px] text-lead">
						Stay compliant locally, automatically.
					</p>
					<div className="mt-[40px] flex items-center justify-center gap-[16px]">
						<Link href="/dashboard/onboard" className="btn-pill-large">
							Get started
						</Link>
						<Link href="/dashboard" className="link-action text-body">
							View the live demo →
						</Link>
					</div>
				</div>
			</section>

			<Footer />
		</>
	);
}

function CompareCard({
	method,
	speed,
	fees,
	efirc,
	highlight,
}: {
	method: string;
	speed: string;
	fees: string;
	efirc: string;
	highlight?: boolean;
}) {
	return (
		<div
			className={
				'flex flex-col gap-[12px] p-[24px] ' +
				(highlight ? 'bg-tile-3 ring-2 ring-action' : '')
			}
		>
			<div className={'text-caption-strong ' + (highlight ? 'text-action-sky' : 'text-ink-muted')}>
				{highlight ? 'CrediBridge' : 'Comparison'}
			</div>
			<div className={'text-body-strong ' + (highlight ? 'text-white' : 'text-white')}>
				{method}
			</div>
			<dl className="mt-2 space-y-2 text-caption text-ink-muted">
				<div className="flex justify-between">
					<dt>Speed</dt>
					<dd className={highlight ? 'text-action-sky' : 'text-white'}>{speed}</dd>
				</div>
				<div className="flex justify-between">
					<dt>Fees</dt>
					<dd className={highlight ? 'text-action-sky' : 'text-white'}>{fees}</dd>
				</div>
				<div className="flex justify-between">
					<dt>e-FIRC</dt>
					<dd className={highlight ? 'text-action-sky' : 'text-white'}>{efirc}</dd>
				</div>
			</dl>
		</div>
	);
}

function Pillar({ title, body }: { title: string; body: string }) {
	return (
		<div className="border-t border-white/15 pt-[24px]">
			<h3 className="text-tagline">{title}</h3>
			<p className="mt-[8px] text-body text-ink-muted">{body}</p>
		</div>
	);
}

const FLOW = [
	{ title: 'Foreign client pays', body: 'Card / PayPal / wallet via Dodo checkout.' },
	{ title: 'Webhook captured', body: 'HMAC-verified payment.succeeded event hits CrediBridge.' },
	{ title: 'Solana escrow', body: 'USDC deposited into a vendor PDA on Token-2022.' },
	{ title: 'AD bank off-ramp', body: 'Programmatic INR credit with S1007 + EDPMS.' },
	{ title: 'e-FIRC issued', body: 'Digitally signed PDF in the vendor inbox.' },
];
