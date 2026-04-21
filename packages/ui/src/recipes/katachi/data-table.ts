import { iro } from '../iro'
import { ji } from '../ji'
import { kumi } from '../kumi'
import { ma } from '../ma'
import { maru } from '../maru'
import { omote } from '../omote'
import { sen } from '../sen'

export const dataTable = {
	wrapper: ['relative flex flex-col', kumi.gap.md],
	stickyWrapper: 'overflow-auto [&>[data-slot=table]]:!overflow-visible',
	stickyHead: ['sticky top-0 z-10', omote.surface],
	batchBar: [
		'flex items-center',
		'min-h-12',
		kumi.gap.md,
		ma.px.md,
		ma.py.sm,
		sen.borderSubtle,
		maru.rounded,
		'border-b',
		omote.tint,
	],
	batchCount: ['font-medium whitespace-nowrap', ji.size.sm, iro.text.muted],
	selectCell: 'w-px align-middle [line-height:0]',
	actionsCell: 'w-px whitespace-nowrap',
	sortButton: [
		'inline-flex items-center',
		kumi.gap.sm,
		iro.text.muted,
		iro.text.hover,
		'select-none',
		'cursor-pointer',
	],
	sortIcon: iro.text.muted,
	sortIconActive: iro.text.default,
	rowLoading: 'animate-pulse opacity-60',
}
