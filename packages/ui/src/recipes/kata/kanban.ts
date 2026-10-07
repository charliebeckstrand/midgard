/**
 * Kanban kata: object-literal surface for the `<Kanban>` board, its columns, and
 * cards. No variants axis. The `column` group nests `base` / `header` / `title`
 * / `body` / `empty` slots, and `base` marks the column a card is over. The `card` group nests `base`, the `handle`, and
 * the drag-state classes (`lifted`, `active`). `skeleton` is the
 * form of the lines of the `KanbanCardSkeleton`.
 */
import { mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, kokkaku, narabi, omote, sen } from '../kiso'

const { disabled, grab } = hannou
const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { rail } = omote
const { border, focus } = sen

export const k = {
	// While the columns overflow, the edge with more columns behind it fades, and
	// the board is a tab stop with an inset ring.
	base: ['flex gap-4 items-stretch', 'min-h-0', ...rail],
	column: {
		base: [
			flex.col,
			'min-w-0',
			'gap-2',
			'w-72 shrink-0',
			'p-4',
			...mode('bg-zinc-50', 'dark:bg-zinc-900/50'),
			border.default,
			rounded.lg,
			// A dragged card from another column (`data-over`) steps the fill and the
			// border up one rung, so the drop target shows.
			...mode(
				'data-over:bg-zinc-100 data-over:border-zinc-950/20',
				'dark:data-over:bg-zinc-800/50 dark:data-over:border-white/20',
			),
		],
		header: [flex.row, 'gap-2', size.md, text.default, weight.semibold],
		title: [flex.fill, 'min-w-0 truncate'],
		body: [flex.col, flex.fill, 'gap-1', 'overflow-y-auto', focus.inset],
		empty: [flex.row, 'justify-center', 'min-h-16', size.sm, text.muted],
	},
	card: {
		// A card with a handle is a grid of two columns: the handle at the start
		// edge, and every other child in the second column, so the lines of the
		// card align with each other. A card with no handle is one column.
		base: [
			'group/kanban-card',
			flex.col,
			'gap-1',
			'has-[>[data-slot=kanban-card-handle]]:grid has-[>[data-slot=kanban-card-handle]]:grid-cols-[auto_minmax(0,1fr)] has-[>[data-slot=kanban-card-handle]]:items-center',
			'*:col-start-2',
			'*:data-[slot=kanban-card-handle]:col-start-1 *:data-[slot=kanban-card-handle]:row-start-1',
			'p-2',
			...mode('bg-white', 'dark:bg-zinc-950'),
			border.default,
			size.sm,
			text.default,
			rounded.md,
			'transition-shadow',
			focus.inset,
			...disabled,
			'data-readonly:cursor-default data-disabled:cursor-not-allowed',
		],
		// The only drag surface of an interactive card, and its keyboard stop.
		handle: [
			flex.row,
			'size-6 shrink-0 justify-center',
			rounded.md,
			text.muted,
			...grab.default,
			'data-disabled:cursor-not-allowed',
			focus.ring,
		],
		lifted: [...focus.lifted.raise, focus.lifted.ring],
		active: 'z-10 shadow-lg relative opacity-95',
	},
	skeleton: kokkaku.kanban,
} as const
