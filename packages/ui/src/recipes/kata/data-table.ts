/**
 * Data-table kata: object-literal surface for the table chrome that sits
 * around `kata/table` — sticky head, batch-action bar, sort controls, and the
 * row-loading pulse. No top-level variants axis; the only sub-recipe is the
 * `sort.icon`, inked or muted by whether its column is the active sort.
 */
import { defineRecipe } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, omote, sen, ugoki } from '../kiso'

const { cursor, fg } = hannou
const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { bg } = omote
const { border, focus } = sen
const { css } = ugoki

/** Sort-direction arrow: inked while its column is the active sort, muted otherwise. */
const sortIcon = defineRecipe({
	active: { true: text.default, false: text.muted },
	defaults: { active: false },
})

export const k = {
	wrapper: ['relative', flex.col, 'gap-2'],
	sticky: {
		wrapper: 'overflow-auto [&>[data-slot=table]]:!overflow-visible',
		head: ['sticky top-0 z-10', bg.surface],
	},
	batch: {
		bar: [
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
		count: [weight.medium, 'whitespace-nowrap', size.sm, text.muted],
	},
	selectCell: 'w-px text-center align-middle [line-height:0]',
	actionsCell: 'w-px whitespace-nowrap',
	sort: {
		button: [flex.inline, text.muted, fg.hover, focus.ring, cursor, 'select-none'],
		icon: sortIcon,
	},
	reorder: {
		// Soften the header cell while it is the actively dragged column.
		cell: 'data-[dragging]:opacity-70',
		// Keeps the grip, title, and any sort control on one baseline.
		layout: [flex.inline, 'items-center gap-1'],
		handle: [
			flex.inline,
			'shrink-0',
			text.muted,
			fg.hover,
			focus.ring,
			'cursor-grab touch-none select-none active:cursor-grabbing',
		],
	},
	rowLoading: [css.pulse, 'opacity-60'],
} as const
