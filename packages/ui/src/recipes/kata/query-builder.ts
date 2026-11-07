/**
 * Query-builder kata: the unit of the `<QueryBuilder>` rule editor. The root
 * slot `base` is the container. `group` is a condition box, and its `nested`
 * axis frames a group inside another group. `rule` is a rule row, and `remove`
 * is its remove control. `value` is the fixed text that stands in for the
 * input of an operator with no value, and `actions` is the action cluster.
 * `parts` is the row of the parts of a rule, and `parts.item` and
 * `parts.range` size each part. The parts of a builder that reorders nest under
 * `sortable`: `sortable` is a node, and `sortable.list`, `sortable.handle`,
 * `sortable.node`, and `sortable.separator` are the other parts. The `instant`
 * motion is an extra.
 */
import { defineKata, mode } from '../../core/recipe'
import { dan, hannou, iro, ji, kasane, narabi, sen, ugoki } from '../kiso'

const { disabled, grab } = hannou
const { text } = iro
const { size } = ji
const { rounded } = kasane
const { flex } = narabi
const { border, focus } = sen

/** A part of a `vertical` rule, which stacks at full width. */
const stacked = 'min-w-auto flex-initial'

export const k = defineKata(
	{
		base: [flex.col, `${dan.gap.scale.md} p-3`, border.default, rounded.lg],
		slots: {
			/**
			 * A nested group that a pointer drag from another group drops its node in
			 * (`data-over`) steps its fill up one rung, so the drop target shows. Forced
			 * colors remove the fill, so there the drop target draws an outline. The
			 * root is the whole builder, so its drop shows only by the drop line.
			 */
			group: {
				base: [flex.col, dan.gap.scale.md],
				nested: {
					true: [
						'p-3',
						...mode('bg-zinc-50', 'dark:bg-zinc-900/40'),
						...mode('data-over:bg-zinc-100', 'dark:data-over:bg-zinc-800/70'),
						'forced-colors:data-over:outline-solid forced-colors:data-over:outline-2',
						'forced-colors:data-over:-outline-offset-2 forced-colors:data-over:outline-[Highlight]',
						border.default,
						rounded.lg,
					],
					false: '',
				},
			},
			rule: ['p-2.5', border.default, rounded.lg],
			/**
			 * The field, operator, and value of a rule share the row from a zero basis.
			 * A range value holds two number inputs, each with its steppers, so it
			 * takes two shares. The minimum width lets a part shrink past the intrinsic
			 * width of an input, so the shares hold. It also keeps the text of a part
			 * readable in a container that sizes to its content, where the equal shares
			 * otherwise cut the longest text. The row wraps a part that cannot get its
			 * minimum to a new line. In a `vertical` rule the parts stack. `orientation`
			 * is a responsive axis, and each of its values writes the same properties.
			 */
			parts: {
				responsive: { orientation: { vertical: 'flex-nowrap', horizontal: 'flex-wrap' } },
				slots: {
					/** A part of a rule. Its width is `w-full`: in a row, the zero basis of `flex-1` decides it. */
					item: {
						base: 'w-full',
						responsive: {
							orientation: { vertical: stacked, horizontal: 'min-w-32 flex-1' },
						},
					},
					/** A range value, which takes two shares of the row. */
					range: {
						base: 'w-full',
						responsive: {
							orientation: { vertical: stacked, horizontal: 'min-w-48 flex-2' },
						},
					},
				},
			},
			remove: 'flex-none',
			value: ['px-3', size.sm, ...text.muted],
			actions: [flex.row, dan.gap.scale.sm],
			/**
			 * A node of a builder that reorders. A held node sits over its neighbors on
			 * an opaque surface, so the nodes it passes do not show through it. The `!`
			 * beats the inline `z-index` that Motion's `Reorder.Item` writes. Forced
			 * colors remove the shadow and repaint the surface, so an outline shows the
			 * held node. A drop from another group draws a line in the gap above the
			 * node (`data-drop="before"`) or below it (`data-drop="after"`), in the lift
			 * accent. The line is a border, which forced colors keep.
			 */
			sortable: {
				base: [
					'flex items-start gap-1.5',
					'data-drop:relative data-drop:before:pointer-events-none data-drop:before:absolute',
					'data-drop:before:inset-x-0 data-drop:before:border-t-2 data-drop:before:rounded-full',
					...mode('data-drop:before:border-violet-600', 'dark:data-drop:before:border-violet-400'),
					'data-[drop=before]:before:-top-1.5 data-[drop=after]:before:-bottom-1.5',
					'data-dragging:relative data-dragging:z-10!',
					'data-dragging:rounded-lg data-dragging:shadow-lg',
					...mode('data-dragging:bg-white', 'dark:data-dragging:bg-zinc-900'),
					'forced-colors:data-dragging:outline-solid forced-colors:data-dragging:outline-2',
					'forced-colors:data-dragging:outline-offset-2 forced-colors:data-dragging:outline-[Highlight]',
				],
				slots: {
					/**
					 * The children of a group while they reorder. The box adds no layout, and
					 * it marks a drag in progress for the separators below.
					 */
					list: 'group/sortable contents',
					/**
					 * The grip centers on the first control line of a rule at each density
					 * step (`dan.space.query.grip`). Beside a group, it sits at the same
					 * height. The grip holds the focus of a held node, so it takes the lift
					 * accent in the shape of its own focus ring.
					 */
					handle: {
						base: [
							dan.space.query.grip,
							'flex size-6 shrink-0 items-center justify-center',
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
						held: { true: focus.lifted.outline, false: '' },
					},
					node: 'min-w-0 flex-1',
					/**
					 * The AND/OR between two nodes aligns with the nodes, past the grip and the
					 * gap. The nodes move over it during a drag, so it fades until the drop.
					 */
					separator: [
						'ps-7.5',
						'motion-safe:transition-opacity group-data-sorting/sortable:opacity-0',
					],
				},
			},
		},
		defaults: { nested: false, held: false },
	},
	{
		/** The move of a node under reduced motion: the node lands at once. */
		instant: ugoki.instant,
	},
)
