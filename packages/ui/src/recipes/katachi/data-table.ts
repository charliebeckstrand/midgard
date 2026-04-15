import { kage } from '../kage'
import { omote } from '../omote'
import { sumi } from '../sumi'
import { take } from '../take'

export const dataTable = {
	wrapper: 'relative',
	stickyWrapper: 'overflow-auto',
	stickyHead: ['sticky top-0 z-10', omote.surface],
	batchBar: [
		'flex items-center gap-3',
		take.px.md,
		take.py.sm,
		kage.borderSubtle,
		'border-b',
		omote.tint,
	],
	batchCount: [sumi.textMuted, 'text-sm font-medium whitespace-nowrap'],
	loadingBody: 'flex items-center justify-center py-16',
	selectCell: 'w-px',
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
