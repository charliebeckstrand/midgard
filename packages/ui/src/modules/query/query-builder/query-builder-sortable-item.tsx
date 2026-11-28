'use client'

import { ArrowUpDown } from 'lucide-react'
import { type DragControls, type InertiaOptions, Reorder, useDragControls } from 'motion/react'
import { type KeyboardEvent, type PointerEvent, type ReactNode, useState } from 'react'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import { MenuMove, type MenuMoveItem } from '../../../components/menu/menu-move'
import { dataAttr } from '../../../core/data-attr'
import { reorderMessages } from '../../../primitives/intl/intl-reorder'
import { useIntl } from '../../../primitives/intl/use-intl'
import { SortableGrip } from '../../../primitives/sortable-grip/sortable-grip'
import { k } from '../../../recipes/kata/query-builder'
import { holdTextSelection } from '../../../utilities/hold-text-selection'
import { isPrimaryPress } from '../../../utilities/primary-press'

/** The slots of the query builder. */
const slots = k()

/** Props for {@link QueryBuilderSortableItem}. @internal */
type QueryBuilderSortableItemProps = {
	/** The id of the node, as its group's `Reorder.Group` keys it. */
	id: string
	/** The name of the node, which labels its grip. */
	label: string
	disabled: boolean
	/** Whether the grip shows. A group with one child has no order to change. */
	handle: boolean
	/** Whether the keyboard holds the node. */
	lifted: boolean
	/** Reads the items of the move menu of the node, when the menu opens. */
	readMoves: (id: string) => MenuMoveItem[][]
	/** The edge of the node that the line of a drop from another group borders, if any. */
	drop?: 'before' | 'after'
	/** The id of the hidden reorder instructions. */
	describedBy: string
	/** Whether the node moves to its new place with no animation, for reduced motion. */
	instant: boolean
	/** The reorder keys of the grip. */
	onKeyDown: (id: string, event: KeyboardEvent) => void
	/** Drops a keyboard lift when the grip loses focus. */
	onBlur: () => void
	/** Called when a pointer drag of this node starts. */
	onDragStart: (id: string, controls: DragControls) => void
	/** Called with the height of the pointer, in the coordinates of the viewport, as a pointer drag of this node moves. */
	onDrag: (id: string, y: number) => void
	/** Called with the end event of Motion when a pointer drag of this node ends. */
	onDragEnd: (event: Event) => void
	children: ReactNode
}

/**
 * One node of a group that reorders: a Motion `Reorder.Item` with a grip before
 * the rule or the nested group, and a move menu after it. The grip is the only
 * drag activator, so the controls of the rule do not start a drag and a touch
 * on the rule scrolls. The grip also takes the reorder keys. The move menu is
 * the path of the drag with one pointer and no drag (WCAG 2.2 SC 2.5.7).
 *
 * @internal
 */
export function QueryBuilderSortableItem({
	id,
	label,
	disabled,
	handle,
	lifted,
	readMoves,
	drop,
	describedBy,
	instant,
	onKeyDown,
	onBlur,
	onDragStart,
	onDrag,
	onDragEnd,
	children,
}: QueryBuilderSortableItemProps) {
	const intl = useIntl()

	const controls = useDragControls()

	const [dragging, setDragging] = useState(false)

	// A pointer drag and a keyboard lift both hold the node.
	const held = dragging || lifted

	// Motion gives the end event, so the drag can tell a drop from a
	// `pointercancel`. The callback of the sortable is not a DOM handler of the
	// item, so it composes no consumer handler.
	const endDrag = (event: Event) => {
		setDragging(false)

		onDragEnd(event)
	}

	return (
		<Reorder.Item
			as="div"
			value={id}
			// Motion makes each item a Tab stop that moves on Space and the arrows.
			// The item has no role and its moves are not announced, and the grip is
			// the one keyboard handle, so the item takes no `tabIndex`. Motion moves
			// an item only on a key that the item itself takes, so its keys go too.
			tabIndex={undefined}
			dragListener={false}
			dragControls={controls}
			transition={instant ? k.instant : k.glide}
			// The release from the pointer to the slot is an animation of the drag,
			// which the transition of the item does not reach. Motion spreads
			// `dragTransition` into the transition of the release, where a `duration`
			// of 0 lands the node at once. The type of the prop names only the
			// inertia options.
			dragTransition={instant ? (k.instant as InertiaOptions) : undefined}
			onDragStart={() => {
				setDragging(true)
				onDragStart(id, controls)
			}}
			onDrag={(_event, info) => onDrag(id, info.point.y - window.scrollY)}
			onDragEnd={endDrag}
			data-slot="query-sortable"
			data-node-id={id}
			data-dragging={dataAttr(held)}
			data-drop={drop}
			className={slots.sortable.base}
		>
			{handle && (
				<SortableGrip
					data-slot="query-reorder-handle"
					aria-describedby={describedBy}
					sortable={{
						listeners: disabled
							? undefined
							: {
									onPointerDown: (event: PointerEvent) => {
										if (!isPrimaryPress(event)) return

										holdTextSelection(event)

										controls.start(event)
									},
									onKeyDown: (event: KeyboardEvent) => onKeyDown(id, event),
									onBlur,
								},
						dragging: held,
					}}
					label={intl.formatMessage(reorderMessages.reorderHandle, { item: label })}
					size="sm"
					disabled={disabled}
					className={k({ held }).sortable.handle}
				/>
			)}
			<div className={slots.sortable.node}>{children}</div>
			{handle && (
				<MenuMove read={() => readMoves(id)}>
					<Button
						variant="bare"
						type="button"
						data-slot="query-move-menu"
						aria-label={intl.formatMessage(reorderMessages.moveHandle, { item: label })}
						disabled={disabled}
						className={slots.sortable.menu}
					>
						<Icon icon={ArrowUpDown} />
					</Button>
				</MenuMove>
			)}
		</Reorder.Item>
	)
}
