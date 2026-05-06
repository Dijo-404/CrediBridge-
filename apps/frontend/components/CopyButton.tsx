'use client';

import { useState } from 'react';

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<button
			type="button"
			onClick={async () => {
				try {
					await navigator.clipboard.writeText(value);
					setCopied(true);
					setTimeout(() => setCopied(false), 1200);
				} catch {
					/* clipboard unavailable */
				}
			}}
			className="rounded-md px-1.5 py-0.5 text-[11px] text-ink-500 hover:bg-ink-100"
		>
			{copied ? 'Copied' : label}
		</button>
	);
}
