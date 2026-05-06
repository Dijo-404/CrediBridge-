export type SessionStatus =
	| 'pending'
	| 'dodo_captured'
	| 'solana_transiting'
	| 'offramped'
	| 'efirc_generated';

const STAGES: { key: SessionStatus; label: string; sub: string }[] = [
	{ key: 'pending', label: 'Awaiting payment', sub: 'Buyer on Dodo checkout' },
	{ key: 'dodo_captured', label: 'Captured', sub: 'Dodo (MoR) holds funds' },
	{ key: 'solana_transiting', label: 'On Solana', sub: 'USDC in escrow vault' },
	{ key: 'offramped', label: 'Off-ramped', sub: 'AD bank credits INR' },
	{ key: 'efirc_generated', label: 'e-FIRC ready', sub: 'FEMA compliant' },
];

const ORDER: Record<SessionStatus, number> = {
	pending: 0,
	dodo_captured: 1,
	solana_transiting: 2,
	offramped: 3,
	efirc_generated: 4,
};

export function StatusPipeline({ status }: { status: SessionStatus }) {
	const current = ORDER[status];
	return (
		<ol className="flex w-full items-stretch gap-2">
			{STAGES.map((s, i) => {
				const state = i < current ? 'done' : i === current ? 'active' : 'idle';
				return (
					<li key={s.key} className="flex-1">
						<div
							className={
								'flex items-center gap-2 rounded-md px-3 py-2 text-xs ring-1 transition ' +
								(state === 'done'
									? 'bg-accent-500/10 text-accent-600 ring-accent-500/30'
									: state === 'active'
										? 'bg-brand-500/10 text-brand-700 ring-brand-500/30 animate-pulse-soft'
										: 'bg-white text-ink-400 ring-ink-200')
							}
						>
							<span
								className={
									'grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ring-1 ' +
									(state === 'done'
										? 'bg-accent-500 text-white ring-accent-500'
										: state === 'active'
											? 'bg-brand-500 text-white ring-brand-500'
											: 'bg-white text-ink-400 ring-ink-200')
								}
							>
								{state === 'done' ? '✓' : i + 1}
							</span>
							<div className="min-w-0">
								<div className="truncate font-medium text-[12px] leading-tight">{s.label}</div>
								<div className="truncate text-[10.5px] opacity-80">{s.sub}</div>
							</div>
						</div>
					</li>
				);
			})}
		</ol>
	);
}

export function StatusChip({ status }: { status: SessionStatus }) {
	const style: Record<SessionStatus, string> = {
		pending: 'bg-ink-100 text-ink-700 ring-ink-200',
		dodo_captured: 'bg-amber-50 text-amber-700 ring-amber-200',
		solana_transiting: 'bg-brand-50 text-brand-700 ring-brand-200',
		offramped: 'bg-violet-50 text-violet-700 ring-violet-200',
		efirc_generated: 'bg-accent-500/10 text-accent-600 ring-accent-500/30',
	};
	const label: Record<SessionStatus, string> = {
		pending: 'Pending',
		dodo_captured: 'Dodo captured',
		solana_transiting: 'On Solana',
		offramped: 'Off-ramped',
		efirc_generated: 'e-FIRC ready',
	};
	return (
		<span className={'chip ' + style[status]}>
			<span
				className={
					'h-1.5 w-1.5 rounded-full ' +
					(status === 'efirc_generated'
						? 'bg-accent-500'
						: status === 'pending'
							? 'bg-ink-400'
							: 'bg-current animate-pulse-soft')
				}
			/>
			{label[status]}
		</span>
	);
}
