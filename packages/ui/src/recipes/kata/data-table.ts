import { hannou, iro, ji, kasane, narabi, omote, sen, ugoki } from '../kiso'

export const k = {
	wrapper: ['relative', narabi.col, 'gap-2'],
	stickyWrapper: 'overflow-auto [&>[data-slot=table]]:!overflow-visible',
	stickyHead: ['sticky top-0 z-10', omote.bg.surface],
	batchBar: [
		narabi.row,
		'min-h-12',
		'gap-2',
		'px-2',
		'py-1',
		sen.border.subtle,
		kasane.rounded.lg,
		'border-b',
		omote.bg.tint,
	],
	batchCount: [ji.weight.medium, 'whitespace-nowrap', ji.size.sm, iro.text.muted],
	selectCell: 'w-px text-center align-middle [line-height:0]',
	actionsCell: 'w-px whitespace-nowrap',
	sortButton: [
		narabi.inlineRow,
		iro.text.muted,
		hannou.text.hover,
		sen.focus.ring,
		hannou.cursor,
		'select-none',
	],
	sortIcon: iro.text.muted,
	sortIconActive: iro.text.default,
	rowLoading: [ugoki.css.pulse, 'opacity-60'],
} as const
