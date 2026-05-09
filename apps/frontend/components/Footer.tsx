import Link from 'next/link';

const COLUMNS = [
	{
		title: 'Product',
		links: [
			{ label: 'Overview', href: '/' },
			{ label: 'Dashboard', href: '/dashboard' },
			{ label: 'Onboard a vendor', href: '/dashboard/onboard' },
		],
	},
	{
		title: 'Compliance',
		links: [
			{ label: 'e-FIRC explainer', href: '#' },
			{ label: 'FEMA / RBI primer', href: '#' },
			{ label: 'Purpose codes (S1007)', href: '#' },
			{ label: 'EDPMS reference', href: '#' },
		],
	},
	{
		title: 'Integrations',
		links: [
			{ label: 'Dodo Payments', href: 'https://docs.dodopayments.com/introduction' },
			{ label: 'Solana / Helius', href: 'https://docs.helius.dev' },
			{ label: 'Anchor framework', href: 'https://www.anchor-lang.com' },
			{ label: 'Token-2022 extensions', href: 'https://solana.com/solutions/token-extensions' },
		],
	},
	{
		title: 'Build',
		links: [
			{ label: 'Hackathon plan', href: '#' },
			{ label: 'GitHub repository', href: '#' },
			{ label: 'Status', href: '#' },
		],
	},
];

export function Footer() {
	return (
		<footer className="bg-parchment text-ink-80">
			<div className="mx-auto max-w-[1024px] px-6 py-[64px]">
				<p className="text-fine-print text-ink-48">
					CrediBridge is a hackathon MVP. The off-ramp is simulated for demo purposes; no live
					banking transactions occur. Pricing and timing claims are illustrative.
				</p>
				<div className="mt-[40px] grid grid-cols-2 gap-[24px] md:grid-cols-4">
					{COLUMNS.map((col) => (
						<div key={col.title}>
							<div className="text-caption-strong tracking-[-0.224px]">{col.title}</div>
							<ul className="mt-1">
								{col.links.map((l) => (
									<li key={l.label} className="text-dense-link">
										<Link
											href={l.href}
											target={l.href.startsWith('http') ? '_blank' : undefined}
											rel={l.href.startsWith('http') ? 'noreferrer' : undefined}
											className="text-ink-80 hover:text-ink"
										>
											{l.label}
										</Link>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
				<div className="mt-[40px] flex flex-col items-start justify-between gap-3 border-t border-hairline pt-[24px] md:flex-row md:items-center">
					<p className="text-fine-print text-ink-48">
						Copyright © {new Date().getFullYear()} CrediBridge. All payment-aggregator
						compliance is inherited from the Merchant of Record (Dodo Payments).
					</p>
					<p className="text-micro-legal text-ink-48">
						Solana Frontier · Superteam India · Dodo Payments prize
					</p>
				</div>
			</div>
		</footer>
	);
}
