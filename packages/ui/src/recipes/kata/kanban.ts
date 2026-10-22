/**
 * Kanban kata: the unit of the `<Kanban>` board, its columns, and cards. A
 * column and a card are each a `Card`, so the card kata gives their padding,
 * radius, and outline, and each steps with density. This kata adds the layout
 * and the drag states on top. The root slot is the board. The `column` slot
 * holds `base`, `header`, `title`, `body`, and `empty`, and `column.base` marks
 * the column a card is over. The `card` slot holds `base`, the `content`
 * column, the drag states `lifted` and `active`, and the `handle`, whose
 * `lifted` axis marks a lifted card. `skeleton` is the form of the lines of
 * the `KanbanCardSkeleton`.
 */
import { defineKata, mode } from '../../core/recipe'
import { dan, hannou, iro, ji, kasane, kokkaku, narabi, omote, sen } from '../kiso'

const { disabled, grab } = hannou
const { on, text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { rail } = omote
const { focus } = sen

export const k = defineKata(
	{
		// While the columns overflow, the edge with more columns behind it fades, and
		// the board is a tab stop with an inset ring.
		base: [`flex ${dan.gap.scale.lg} items-stretch`, 'min-h-0', ...rail],
		slots: {
			// The column is a `Card` with the `tint` fill. A dragged card from another
			// column (`data-over`) steps the fill and the outline up one rung, so the
			// drop target shows.
			column: {
				base: [
					flex.col,
					dan.gap.scale.sm,
					'w-72 shrink-0',
					...mode(
						'data-over:bg-zinc-950/10 data-over:outline-zinc-950/20',
						'dark:data-over:bg-white/15 dark:data-over:outline-white/20',
					),
				],
				slots: {
					header: [flex.row, dan.gap.scale.sm, size.md, text.default, weight.semibold],
					title: [flex.fill, 'min-w-0 truncate'],
					body: [flex.col, flex.fill, dan.gap.scale.xs, 'overflow-y-auto', focus.inset],
					// `on.wash.muted`, not `muted`: the empty message sits on the tint fill of
					// the column Card, which `muted` is not legal over. See `iro/ramp.ts`.
					empty: [flex.row, 'justify-center', 'min-h-16', size.sm, on.wash.muted],
				},
			},
			// The card is a `Card` with the `surface` fill. It holds its handle at its
			// start edge, centered on its height, and the `card.content` column beside it.
			// A card holds no media, so it does not clip: the focus ring of the handle
			// stays whole at each density step.
			card: {
				base: [
					'overflow-visible',
					flex.row,
					dan.gap.scale.xs,
					size.sm,
					text.default,
					'transition-shadow',
					...disabled,
					'data-readonly:cursor-default data-disabled:cursor-not-allowed',
				],
				slots: {
					// Each child of the card other than its handle, in one column.
					content: [flex.col, flex.fill, 'min-w-0', dan.gap.scale.xs],
					// The card raises while the keyboard lifts it.
					lifted: focus.lifted.raise,
					// The clone of a dragged card in the drag overlay.
					active: 'z-10 shadow-lg opacity-95',
					handle: {
						// The only drag surface of an interactive card, and its keyboard stop.
						base: [
							flex.row,
							'size-6 shrink-0 justify-center',
							rounded.md,
							text.muted,
							...grab.default,
							'data-disabled:cursor-not-allowed',
							focus.ring,
						],
						// The handle holds the focus of a lifted card, so it takes the accent in
						// the shape of its own focus ring.
						lifted: { true: focus.lifted.outline, false: '' },
					},
				},
			},
		},
	},
	{ skeleton: kokkaku.kanban },
)
