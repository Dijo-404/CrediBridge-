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
		<ol className="grid grid-cols-5 gap-[2px]">
			{STAGES.map((s, i) => {
				const state = i < current ? 'done' : i === current ? 'active' : 'idle';
				return (
					<li key={s.key} className="flex flex-col">
						<div
							className={
								'h-[3px] w-full ' +
								(state === 'done'
									? 'bg-action'
									: state === 'active'
										? 'bg-action'
										: 'bg-hairline')
							}
						/>
						<div className="pt-[10px]">
							<div
								className={
									'text-caption-strong tracking-[-0.224px] ' +
									(state === 'idle' ? 'text-ink-48' : 'text-ink')
								}
							>
								{s.label}
							</div>
							<div className="text-fine-print text-ink-48 mt-[2px]">{s.sub}</div>
						</div>
					</li>
				);
			})}
		</ol>
	);
}

export function StatusChip({ status }: { status: SessionStatus }) {
	const label: Record<SessionStatus, string> = {
		pending: 'Pending',
		dodo_captured: 'Dodo captured',
		solana_transiting: 'On Solana',
		offramped: 'Off-ramped',
		efirc_generated: 'e-FIRC ready',
	};
	const dot =
		status === 'efirc_generated'
			? 'bg-action'
			: status === 'pending'
				? 'bg-ink-muted'
				: 'bg-action';
	return (
		<span className="inline-flex items-center gap-2 text-caption tracking-[-0.224px]">
			<span className={'dot ' + dot} />
			{label[status]}
		</span>
	);
}
