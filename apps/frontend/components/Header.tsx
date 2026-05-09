import Link from 'next/link';

export function Header({ pageLabel }: { pageLabel?: string }) {
	return (
		<>
			{/* Global nav — thin black strip pinned to top */}
			<nav className="sticky top-0 z-50 h-[44px] bg-black text-white">
				<div className="mx-auto flex h-full max-w-[1024px] items-center justify-between px-6 text-nav-link">
					<Link href="/" className="flex items-center gap-2">
						<svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
							<path d="M3 12h18M9 6l-6 6 6 6M15 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
						<span className="text-nav-link tracking-[-0.12px]">CrediBridge</span>
					</Link>
					<div className="hidden items-center gap-[24px] md:flex">
						<Link href="/" className="opacity-80 hover:opacity-100">Overview</Link>
						<Link href="/dashboard" className="opacity-80 hover:opacity-100">Dashboard</Link>
						<Link href="/dashboard/onboard" className="opacity-80 hover:opacity-100">Onboard</Link>
						<a
							href="https://docs.dodopayments.com/introduction"
							target="_blank"
							rel="noreferrer"
							className="opacity-80 hover:opacity-100"
						>
							Dodo
						</a>
						<a
							href="https://docs.helius.dev"
							target="_blank"
							rel="noreferrer"
							className="opacity-80 hover:opacity-100"
						>
							Solana
						</a>
					</div>
					<div className="flex items-center gap-2">
						<button className="btn-utility" aria-label="Search">⌘K</button>
					</div>
				</div>
			</nav>
			{/* Frosted sub-nav */}
			<div className="sticky top-[44px] z-40 subnav-frost border-b border-black/5">
				<div className="mx-auto flex h-full max-w-[1024px] items-center justify-between px-6">
					<div className="text-tagline tracking-[0.231px]">{pageLabel ?? 'CrediBridge'}</div>
					<div className="flex items-center gap-[24px] text-btn-utility">
						<Link href="/dashboard" className="link-action">Open dashboard</Link>
						<Link href="/dashboard/onboard" className="btn-pill text-caption !px-[16px] !py-[6px]">
							Onboard vendor
						</Link>
					</div>
				</div>
			</div>
		</>
	);
}
