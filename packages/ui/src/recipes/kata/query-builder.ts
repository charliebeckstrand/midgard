/**
 * Query-builder kata: object-literal surface for the `<QueryBuilder>` rule
 * editor. No variants axis: flat slots for the `base` container, the
 * `group.base` and `group.nested` condition boxes, a `rule` row, and its
 * `remove` control. The rest are the fixed `value` text that stands in for the
 * input of an operator with no value, and the `actions` cluster. The `parts`
 * group holds the parts of a rule row (`parts.base`) and sizes each one
 * (`parts.item`, and `parts.range` for a range value). The `sortable` slots hold
 * a node, its drag `handle`, and the AND/OR `separator` when the builder reorders.
 */
import { mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, sen } from '../kiso'
import { dan } from '../kiso/dan'

const { disabled, grab } = hannou
const { text } = iro
const { size } = ji
const { rounded } = kasane
const { flex } = narabi
const { border, focus } = sen

export const k = {
	base: [flex.col, `${dan.gap.scale.md} p-3`, border.default, rounded.lg],
	group: {
		base: [flex.col, dan.gap.scale.md],
		nested: ['p-3', ...mode('bg-zinc-50', 'dark:bg-zinc-900/40'), border.default, rounded.lg],
	},
	rule: ['p-2.5', border.default, rounded.lg],
	// The field, operator, and value of a rule share the row from a zero basis.
	// A range value holds two number inputs, each with its steppers, so it takes
	// two shares. The minimum width lets a part shrink past the intrinsic width
	// of an input, so the shares hold. It also keeps the text of a part
	// readable in a container that sizes to its content, where the equal shares
	// otherwise cut the longest text. The row (`base`) wraps a part that cannot
	// get its minimum to a new line. Below `sm` the parts stack, each at full
	// width.
	parts: {
		base: 'sm:flex-wrap',
		item: 'w-full sm:min-w-32 sm:flex-1',
		range: 'w-full sm:min-w-48 sm:flex-2',
	},
	remove: 'flex-none',
	value: ['px-3', size.sm, ...text.muted],
	actions: [flex.row, dan.gap.scale.sm],
	sortable: {
		// The children of a group while they reorder. The box adds no layout, and
		// it marks a drag in progress for the separators below.
		list: 'group/sortable contents',
		// A held node sits over its neighbors on an opaque surface, so the nodes
		// it passes do not show through it.
		base: [
			'flex items-start gap-1.5',
			'data-dragging:relative data-dragging:z-10',
			'data-dragging:rounded-lg data-dragging:shadow-lg',
			...mode('data-dragging:bg-white', 'dark:data-dragging:bg-zinc-900'),
		],
		// The grip centers on the first control line of a rule: the rule's border
		// and `p-2.5`, then half a control. Beside a group, it sits at the same
		// height.
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
		// The AND/OR between two nodes aligns with the nodes, past the grip and
		// the gap. The nodes move over it during a drag, so it fades until the drop.
		separator: ['ps-7.5', 'motion-safe:transition-opacity group-data-sorting/sortable:opacity-0'],
	},
} as const
