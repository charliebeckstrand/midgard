/**
 * Query-builder kata: the unit of the `<QueryBuilder>` rule editor. The root
 * slot `base` is the container. `group` is a condition box, and its `nested`
 * axis frames a group inside another group. `rule` is a rule row, and `remove`
 * is its remove control. `value` is the fixed text that stands in for the
 * input of an operator with no value, and `actions` is the action cluster.
 * `parts` is the row of the parts of a rule, and `part` and `range` size each
 * part. `sortable`, `item`, `handle`, `node`, and `separator` are the parts of
 * a builder that reorders. The `instant` motion is an extra.
 */
import { defineKata, mode } from '../../core/recipe'
import { dan, hannou, iro, ji, kasane, narabi, sen, ugoki } from '../kiso'

const { disabled, grab } = hannou
const { text } = iro
const { size } = ji
const { rounded } = kasane
const { flex } = narabi
const { border, focus } = sen

/*
 * The field, operator, and value of a rule share the row from a zero basis. A
 * range value holds two number inputs, each with its steppers, so it takes two
 * shares. The minimum width lets a part shrink past the intrinsic width of an
 * input, so the shares hold. It also keeps the text of a part readable in a
 * container that sizes to its content, where the equal shares otherwise cut
 * the longest text. The row (`parts`) wraps a part that cannot get its minimum
 * to a new line. In a `vertical` rule the parts stack, each at full width.
 * `orientation` is a responsive axis, and each of its values writes the same
 * properties. The width of each part is `w-full`: in a row, the zero basis of
 * `flex-1` decides it.
 */
export const k = defineKata(
	{
		base: [flex.col, `${dan.gap.scale.md} p-3`, border.default, rounded.lg],
		slots: {
			group: {
				base: [flex.col, dan.gap.scale.md],
				nested: {
					true: ['p-3', ...mode('bg-zinc-50', 'dark:bg-zinc-900/40'), border.default, rounded.lg],
					false: '',
				},
			},
			rule: ['p-2.5', border.default, rounded.lg],
			parts: {
				base: '',
				responsive: { orientation: { vertical: 'flex-nowrap', horizontal: 'flex-wrap' } },
			},
			part: {
				base: 'w-full',
				responsive: {
					orientation: { vertical: 'min-w-auto flex-initial', horizontal: 'min-w-32 flex-1' },
				},
			},
			range: {
				base: 'w-full',
				responsive: {
					orientation: { vertical: 'min-w-auto flex-initial', horizontal: 'min-w-48 flex-2' },
				},
			},
			remove: 'flex-none',
			value: ['px-3', size.sm, ...text.muted],
			actions: [flex.row, dan.gap.scale.sm],
			/**
			 * The children of a group while they reorder. The box adds no layout, and
			 * it marks a drag in progress for the separators below.
			 */
			sortable: 'group/sortable contents',
			/**
			 * A held node sits over its neighbors on an opaque surface, so the nodes it
			 * passes do not show through it.
			 */
			item: [
				'flex items-start gap-1.5',
				'data-dragging:relative data-dragging:z-10',
				'data-dragging:rounded-lg data-dragging:shadow-lg',
				...mode('data-dragging:bg-white', 'dark:data-dragging:bg-zinc-900'),
			],
			/**
			 * The grip centers on the first control line of a rule: the rule's border
			 * and `p-2.5`, then half a control. Beside a group, it sits at the same
			 * height.
			 */
			handle: [
				'mt-4.5 flex size-6 shrink-0 items-center justify-center',
				rounded.md,
				...grab.default,
				...text.muted,
				...mode(
					'hover:not-disabled:bg-zinc-100 hover:not-disabled:text-zinc-700',
					'dark:hover:not-disabled:bg-zinc-800 dark:hover:not-disabled:text-zinc-300',
				),
				...focus.ring,
				...disabled,
				'disabled:cursor-not-allowed',
			],
			node: 'min-w-0 flex-1',
			/**
			 * The AND/OR between two nodes aligns with the nodes, past the grip and the
			 * gap. The nodes move over it during a drag, so it fades until the drop.
			 */
			separator: ['ps-7.5', 'motion-safe:transition-opacity group-data-sorting/sortable:opacity-0'],
		},
		defaults: { nested: false },
	},
	{
		/** The move of a node under reduced motion: the node lands at once. */
		instant: ugoki.instant,
	},
)
