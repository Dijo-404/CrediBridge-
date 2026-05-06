import Link from 'next/link';

export function Header() {
	return (
		<header className="sticky top-0 z-30 border-b border-ink-200/70 bg-white/80 backdrop-blur">
			<div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
				<Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
					<span className="grid h-7 w-7 place-items-center rounded-md bg-ink-900 text-white">
						<svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M3 10h14M7 5l-4 5 4 5M13 5l4 5-4 5" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</span>
					CrediBridge
				</Link>
				<nav className="flex items-center gap-1 text-sm">
					<Link href="/dashboard" className="btn-ghost">
						Dashboard
					</Link>
					<Link href="/dashboard/onboard" className="btn-ghost">
						Onboard
					</Link>
					<a
						href="https://docs.dodopayments.com/introduction"
						target="_blank"
						rel="noreferrer"
						className="btn-secondary"
					>
						Dodo docs ↗
					</a>
				</nav>
			</div>
		</header>
	);
}
