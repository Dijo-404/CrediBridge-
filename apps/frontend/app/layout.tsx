import type { ReactNode } from 'react';

export const metadata = {
	title: 'CrediBridge',
	description:
		'Stablecoin-speed cross-border payments with banking-grade compliance for Indian software exporters.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
				{children}
			</body>
		</html>
	);
}
