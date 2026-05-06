import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
	title: 'CrediBridge — Stablecoin speed. Banking compliance.',
	description:
		'Cross-border payments for Indian software exporters. Capture in USD via Dodo, settle on Solana, off-ramp to INR with a valid e-FIRC — in ~90 seconds.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body className="min-h-screen antialiased">{children}</body>
		</html>
	);
}
