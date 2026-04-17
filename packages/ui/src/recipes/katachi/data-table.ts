import { kage } from '../kage'
import { ma } from '../ma'
import { maru } from '../maru'
import { omote } from '../omote'
import { sumi } from '../sumi'

export const dataTable = {
	wrapper: 'relative flex flex-col gap-2',
	stickyWrapper: 'overflow-auto [&>[data-slot=table]]:!overflow-visible',
	stickyHead: ['sticky top-0 z-10', omote.surface],
	batchBar: [
		'flex items-center gap-3 min-h-12',
		ma.density.px.md,
		ma.density.py.sm,
		kage.borderSubtle,
		maru.rounded,
		'border-b',
		omote.tint,
	],
	batchCount: [sumi.textMuted, 'text-sm font-medium whitespace-nowrap'],
	loadingBody: 'flex items-center justify-center py-16',
	selectCell: 'w-px align-middle [line-height:0]',
	actionsCell: 'w-px whitespace-nowrap',
	sortButton: [
		'inline-flex items-center gap-1 cursor-pointer select-none',
		sumi.textMuted,
		sumi.textHover,
	],
	sortIcon: sumi.textMuted,
	sortIconActive: sumi.text,
	rowLoading: 'animate-pulse opacity-60',
}
