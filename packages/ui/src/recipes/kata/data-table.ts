import { iro, ji, omote, sen } from '..'

export const k = {
	wrapper: ['relative flex flex-col', 'gap-sm'],
	stickyWrapper: 'overflow-auto [&>[data-slot=table]]:!overflow-visible',
	stickyHead: ['sticky top-0 z-10', omote.surface],
	batchBar: [
		'flex items-center',
		'min-h-12',
		'gap-sm',
		'px-sm',
		'py-xs',
		sen.borderSubtle,
		'rounded-lg',
		'border-b',
		omote.tint,
	],
	batchCount: ['font-medium whitespace-nowrap', ji.size.sm, iro.text.muted],
	selectCell: 'w-px text-center align-middle [line-height:0]',
	actionsCell: 'w-px whitespace-nowrap',
	sortButton: [
		'inline-flex items-center',
		iro.text.muted,
		iro.text.hover,
		sen.focus.ring,
		'select-none',
	],
	sortIcon: iro.text.muted,
	sortIconActive: iro.text.default,
	rowLoading: 'animate-pulse opacity-60',
}
