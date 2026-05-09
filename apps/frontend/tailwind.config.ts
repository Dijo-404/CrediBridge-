import type { Config } from 'tailwindcss';

const config: Config = {
	content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
	theme: {
		extend: {
			fontFamily: {
				display: [
					'SF Pro Display',
					'system-ui',
					'-apple-system',
					'BlinkMacSystemFont',
					'Inter',
					'sans-serif',
				],
				text: [
					'SF Pro Text',
					'system-ui',
					'-apple-system',
					'BlinkMacSystemFont',
					'Inter',
					'sans-serif',
				],
				sans: [
					'SF Pro Text',
					'system-ui',
					'-apple-system',
					'BlinkMacSystemFont',
					'Inter',
					'sans-serif',
				],
			},
			colors: {
				// Brand & accent
				action: {
					DEFAULT: '#0066cc',
					focus: '#0071e3',
					sky: '#2997ff',
				},
				// Surface
				canvas: '#ffffff',
				parchment: '#f5f5f7',
				pearl: '#fafafc',
				tile: {
					1: '#272729',
					2: '#2a2a2c',
					3: '#252527',
				},
				// Ink (text)
				ink: {
					DEFAULT: '#1d1d1f',
					80: '#333333',
					48: '#7a7a7a',
					muted: '#cccccc',
				},
				// Hairlines
				hairline: '#e0e0e0',
				divider: '#f0f0f0',
				// Translucent chip
				chip: '#d2d2d7',
			},
			fontSize: {
				'hero-display': [
					'56px',
					{ lineHeight: '1.07', letterSpacing: '-0.28px', fontWeight: '600' },
				],
				'display-lg': [
					'40px',
					{ lineHeight: '1.10', letterSpacing: '0', fontWeight: '600' },
				],
				'display-md': [
					'34px',
					{ lineHeight: '1.10', letterSpacing: '-0.374px', fontWeight: '600' },
				],
				lead: [
					'28px',
					{ lineHeight: '1.14', letterSpacing: '0.196px', fontWeight: '400' },
				],
				'lead-airy': [
					'24px',
					{ lineHeight: '1.5', letterSpacing: '0', fontWeight: '300' },
				],
				tagline: [
					'21px',
					{ lineHeight: '1.19', letterSpacing: '0.231px', fontWeight: '600' },
				],
				body: [
					'17px',
					{ lineHeight: '1.47', letterSpacing: '-0.374px', fontWeight: '400' },
				],
				'body-strong': [
					'17px',
					{ lineHeight: '1.24', letterSpacing: '-0.374px', fontWeight: '600' },
				],
				'dense-link': [
					'17px',
					{ lineHeight: '2.41', letterSpacing: '0', fontWeight: '400' },
				],
				caption: [
					'14px',
					{ lineHeight: '1.43', letterSpacing: '-0.224px', fontWeight: '400' },
				],
				'caption-strong': [
					'14px',
					{ lineHeight: '1.29', letterSpacing: '-0.224px', fontWeight: '600' },
				],
				'btn-large': [
					'18px',
					{ lineHeight: '1.0', letterSpacing: '0', fontWeight: '300' },
				],
				'btn-utility': [
					'14px',
					{ lineHeight: '1.29', letterSpacing: '-0.224px', fontWeight: '400' },
				],
				'fine-print': [
					'12px',
					{ lineHeight: '1.0', letterSpacing: '-0.12px', fontWeight: '400' },
				],
				'micro-legal': [
					'10px',
					{ lineHeight: '1.3', letterSpacing: '-0.08px', fontWeight: '400' },
				],
				'nav-link': [
					'12px',
					{ lineHeight: '1.0', letterSpacing: '-0.12px', fontWeight: '400' },
				],
			},
			borderRadius: {
				none: '0px',
				xs: '5px',
				sm: '8px',
				md: '11px',
				lg: '18px',
			},
			spacing: {
				17: '17px',
				18: '18px',
				22: '22px',
			},
			boxShadow: {
				product: '3px 5px 30px 0 rgba(0,0,0,0.22)',
			},
			backdropBlur: {
				frost: '20px',
			},
			letterSpacing: {
				tight2: '-0.374px',
				tight3: '-0.28px',
				tighter1: '-0.224px',
				wider1: '0.196px',
				widerlg: '0.231px',
			},
		},
	},
};

export default config;
