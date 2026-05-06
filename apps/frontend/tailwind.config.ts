import type { Config } from 'tailwindcss';

const config: Config = {
	content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
	theme: {
		extend: {
			fontFamily: {
				sans: [
					'ui-sans-serif',
					'system-ui',
					'-apple-system',
					'Segoe UI',
					'Inter',
					'sans-serif',
				],
				mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
			},
			colors: {
				ink: {
					50: '#f7f7f8',
					100: '#eeeef1',
					200: '#d9d9e0',
					300: '#b7b8c3',
					400: '#8b8d9e',
					500: '#666877',
					600: '#4a4c5a',
					700: '#363744',
					800: '#202130',
					900: '#0f1020',
					950: '#080814',
				},
				brand: {
					50: '#eef4ff',
					100: '#dae6ff',
					200: '#bcd1ff',
					300: '#8fb1ff',
					400: '#5b87ff',
					500: '#345eff',
					600: '#1f3ef5',
					700: '#1a30d8',
					800: '#1a2bae',
					900: '#1c2c89',
				},
				accent: {
					400: '#39d8a5',
					500: '#11c590',
					600: '#0aa67a',
				},
			},
			boxShadow: {
				card: '0 1px 2px rgba(15,16,32,0.04), 0 8px 24px -12px rgba(15,16,32,0.12)',
				ring: '0 0 0 1px rgba(15,16,32,0.06)',
			},
			animation: {
				'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
			},
			keyframes: {
				'pulse-soft': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.55' },
				},
			},
		},
	},
};

export default config;
