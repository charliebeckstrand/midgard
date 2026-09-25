/**
 * Query-builder kata: object-literal surface for the `<QueryBuilder>` rule
 * editor. No variants axis: flat slots for the `base` container, the
 * `group.base` and `group.nested` condition boxes, a `rule` row, and its
 * `remove` control. The rest are the fixed `value` text standing in for a
 * value-less operator's input, the AND/OR `separator`, and the `actions` cluster.
 * The `part` and `rangePart` slots size the parts of a rule row. The
 * `sortable` slots hold a node and its drag `handle` when the builder reorders.
 */
import { mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, sen } from '../kiso'

const { disabled, grab } = hannou
const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { border, focus } = sen

export const k = {
	base: [flex.col, 'gap-3 p-3', border.default, rounded.lg],
	group: {
		base: 'flex flex-col gap-3',
		nested: ['p-3', ...mode('bg-zinc-50', 'dark:bg-zinc-900/40'), border.default, rounded.lg],
	},
	rule: ['p-2.5', border.default, rounded.lg],
	// The field, operator, and value of a rule share the row from a zero basis.
	// A range value holds two number inputs, each with its steppers, so it takes
	// two shares. `min-w-0` lets a part shrink past the intrinsic width of an
	// input, so the shares hold. Below `sm` the parts stack, each at full width.
	part: 'w-full sm:min-w-0 sm:flex-1',
	rangePart: 'w-full sm:min-w-0 sm:flex-2',
	remove: 'flex-none',
	value: ['px-3', size.sm, ...text.muted],
	separator: [size.xs, weight.medium, ...text.muted, 'uppercase'],
	actions: 'flex items-center gap-2',
	sortable: {
		// The children of a group while they reorder. The box adds no layout, and
		// it marks a drag in progress for the separators below.
		list: 'group/sortable contents',
		// A held node sits over its neighbours on an opaque surface, so the nodes
		// it passes do not show through it.
		base: [
			'flex items-start gap-1.5',
			'data-[dragging]:relative data-[dragging]:z-10',
			'data-[dragging]:rounded-lg data-[dragging]:shadow-lg',
			...mode('data-[dragging]:bg-white', 'dark:data-[dragging]:bg-zinc-900'),
		],
		// The grip centres on the first control line of a rule: the rule's border
		// and `p-2.5`, then half a control. Beside a group, it sits at the same
		// height.
		handle: [
			'mt-4.5 flex size-6 shrink-0 items-center justify-center rounded-md',
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
		separator: ['ps-7.5', 'motion-safe:transition-opacity group-data-[sorting]/sortable:opacity-0'],
	},
} as const
