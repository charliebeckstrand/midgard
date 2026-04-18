import { kage } from '../kage'
import { kumi } from '../kumi'
import { ma } from '../ma'
import { maru } from '../maru'
import { omote } from '../omote'
import { sumi } from '../sumi'
import { take } from '../take'

export const dataTable = {
	wrapper: ['relative flex flex-col', take.gap.md],
	stickyWrapper: 'overflow-auto [&>[data-slot=table]]:!overflow-visible',
	stickyHead: ['sticky top-0 z-10', omote.surface],
	batchBar: [
		'flex items-center',
		'min-h-12',
		take.gap.md,
		ma.density.px.md,
		ma.density.py.sm,
		kage.borderSubtle,
		maru.rounded,
		'border-b',
		omote.tint,
	],
	batchCount: ['font-medium whitespace-nowrap', take.text.sm, sumi.textMuted],
	loadingBody: ['flex', kumi.center, 'py-16'],
	selectCell: 'w-px align-middle [line-height:0]',
	actionsCell: 'w-px whitespace-nowrap',
	sortButton: [
		'inline-flex items-center',
		take.gap.sm,
		sumi.textMuted,
		sumi.textHover,
		'select-none',
		'cursor-pointer',
	],
	sortIcon: sumi.textMuted,
	sortIconActive: sumi.text,
	rowLoading: 'animate-pulse opacity-60',
}
