import { hannou, iro, ji, kasane, narabi, omote, sen, ugoki } from '../kiso'

const { cursor } = hannou
const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { bg } = omote
const { border, focus } = sen
const { css } = ugoki

export const k = {
	wrapper: ['relative', flex.col, 'gap-2'],
	stickyWrapper: 'overflow-auto [&>[data-slot=table]]:!overflow-visible',
	stickyHead: ['sticky top-0 z-10', bg.surface],
	batchBar: [
		flex.row,
		'min-h-12',
		'gap-2',
		'px-2',
		'py-1',
		border.subtle,
		rounded.lg,
		'border-b',
		bg.tint,
	],
	batchCount: [weight.medium, 'whitespace-nowrap', size.sm, text.muted],
	selectCell: 'w-px text-center align-middle [line-height:0]',
	actionsCell: 'w-px whitespace-nowrap',
	sortButton: [flex.inline, text.muted, hannou.text.hover, focus.ring, cursor, 'select-none'],
	sortIcon: text.muted,
	sortIconActive: text.default,
	rowLoading: [css.pulse, 'opacity-60'],
} as const
