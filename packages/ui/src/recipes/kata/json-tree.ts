/**
 * JSON-tree kata: the unit of the collapsible JSON viewer. The `value` slot
 * takes a syntax color for each {@link JsonValueType} (the `type` axis),
 * authored inline with `mode()`. These editor-style
 * hues are local to this viewer, not a shared iro palette. Rows, the expand
 * toggle, chevron, and the collapse motion config round out the surface.
 */
import { defineKata, mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, sen, ugoki } from '../kiso'

const { cursor, fg, turn } = hannou
const { text } = iro
const { family, size } = ji
const { rounded } = kasane
const { flex, nest } = narabi
const { collapse } = ugoki
const { focus, forced } = sen

/** The syntax-highlight classes a {@link JsonTree} node can take: one per primitive value kind plus `key` for object property names. */
export type JsonValueType = 'string' | 'number' | 'boolean' | 'null' | 'key'

const color = {
	key: mode('text-sky-700', 'dark:text-sky-400'),
	string: mode('text-emerald-700', 'dark:text-emerald-400'),
	number: mode('text-amber-700', 'dark:text-amber-400'),
	boolean: mode('text-violet-600', 'dark:text-violet-400'),
	null: text.muted,
} satisfies Record<JsonValueType, readonly string[] | string>

const row = [
	'group/json-node',
	flex.row,
	'w-full',
	nest.gap,
	'py-0.5',
	size.sm,
	rounded.lg,
	...mode('has-focus-visible:bg-blue-100/60', 'dark:has-focus-visible:bg-blue-500/30'),
	// Forced colors remove the background. This inset outline shows the focus there.
	'forced-colors:has-focus-visible:outline-solid forced-colors:has-focus-visible:outline-2',
	'forced-colors:has-focus-visible:-outline-offset-2 forced-colors:has-focus-visible:outline-[Highlight]',
]

export const k = defineKata(
	{
		base: [
			'inline-flex flex-col',
			family.mono,
			// The inputs of `narabi.nest`: the width of the `sm` chevron icon and the
			// gap after it. They are fixed, as the text and the row padding are, so the
			// tree keeps one geometry at each density step.
			'[--nest-mark:--spacing(4.5)] [--nest-gap:--spacing(1)]',
		],
		/**
		 * The scroller of the windowed tree. Focus parks on it while the focused row is outside
		 * the window. `focus.inset` removes the browser outline and draws the inset ring of the
		 * library. The scroll clips an outset ring.
		 */
		windowed: { true: focus.inset, false: '' },
		slots: {
			/**
			 * A spacer of the windowed tree. It holds the height of the rows outside the
			 * window. It has no content, so in the `base` flex column it shrinks to zero
			 * when the tree has a bounded height. Then the tree cannot scroll past its
			 * first window. `shrink-0` keeps its size.
			 */
			spacer: 'shrink-0',
			row,
			leaf: [flex.row, 'flex-1', 'min-w-0 outline-none', nest.gap],
			toggle: [
				flex.row,
				'flex-1',
				'min-w-0 text-start',
				...cursor,
				'outline-none',
				nest.gap,
				text.muted,
				fg.hover,
				...fg.open,
				rounded.lg,
			],
			content: {
				base: [flex.inline, 'min-w-0', 'gap-1'],
				// Forced colors remove the wash, so a match paints the `Mark` pair of
				// `sen.forced.highlight`, which keeps the contrast of the text on it.
				highlighted: {
					true: [...iro.match, rounded.lg, forced.highlight],
					false: '',
				},
			},
			chevron: {
				base: [nest.mark, flex.inline, 'justify-center', ...turn],
				slots: {
					/** The box in place of the chevron on a row that does not open, so the rows align. */
					spacer: ['inline-block', nest.mark],
				},
			},
			index: text.muted,
			punctuation: text.muted,
			summary: text.muted,
			/** The start padding of the children of a nested group: one level of `narabi.nest`. */
			indent: nest.indent,
			/** A row of the windowed tree, which pads to the level that its style sets in `--nest-depth`. */
			depth: nest.depth,
			/** The syntax color of a value or a key, by {@link JsonValueType}. */
			value: { type: color },
		},
	},
	{ motion: collapse.fade },
)
