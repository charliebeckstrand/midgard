'use client'

import { domMax, LazyMotion, Reorder } from 'motion/react'
import { type ReactNode, useCallback, useId, useMemo, useRef } from 'react'
import { cn, dataAttr, querySlot } from '../../../core'
import { LIFT_INSTRUCTIONS } from '../../../hooks/use-keyboard-lifted'
import { useKeyboardReorder } from '../../../hooks/use-keyboard-reorder'
import { usePrefersReducedMotion } from '../../../hooks/use-prefers-reduced-motion'
import { useReorderDrag } from '../../../hooks/use-reorder-drag'
import { k } from '../../../recipes/kata/query-builder'
import { describeNode } from '../engine/query-announcements'
import type { QueryGroup, QueryNode } from '../engine/types'
import { useQueryBuilderActions, useQueryBuilderState } from './context'
import { QueryBuilderSortableItem } from './query-builder-sortable-item'

/** Props for {@link QueryBuilderSortable}. @internal */
type QueryBuilderSortableProps = {
	/** The group whose children reorder. */
	group: QueryGroup
	/** The AND/OR between the slot at the index and the slot before it, or nothing. */
	separator: (index: number) => ReactNode
	/** The rule or the nested group that a child renders. */
	node: (child: QueryNode) => ReactNode
}

/** The key of a node in its group's sortable list. @internal */
const getKey = (node: QueryNode) => node.id

/** The step of a key in the column of nodes, or `null` for a key off it. @internal */
const stepFor = (key: string) => (key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : null)

/**
 * The reorder of one group over Motion's `Reorder`: its children reorder with a
 * pointer or with the keyboard, and each change commits through the `move`
 * action. Each group is its own `Reorder.Group`, so a node moves only among its
 * siblings.
 *
 * @remarks
 * Only the grip starts a pointer drag. The nodes move in a draft order as the
 * pointer passes them, and the drop commits the move once. Escape cancels the
 * drag and puts the nodes back. With the keyboard, Space on a grip picks the
 * node up, each arrow key moves it one position, and Space, Enter, or Escape
 * drops it. Each step is announced by the summary text of the node and its
 * position in the group.
 *
 * The AND/OR separators belong to the slots, not to the nodes, because each
 * combinator keeps its position through a move. So a drag moves the nodes
 * between the separators.
 *
 * @internal
 */
export function QueryBuilderSortable({ group, separator, node }: QueryBuilderSortableProps) {
	const { fields, disabled } = useQueryBuilderState()

	const { move } = useQueryBuilderActions()

	const listRef = useRef<HTMLDivElement>(null)

	const children = group.children

	const ids = useMemo(() => children.map(getKey), [children])

	const name = useCallback(
		(id: string) => {
			const child = children.find((node) => node.id === id)

			return child === undefined ? '' : describeNode(child, fields)
		},
		[children, fields],
	)

	// The keyboard moves focus to the grip of a node. The ids are unique in the
	// tree, so the lookup cannot find a node of a nested group.
	const focusItem = useCallback((id: string) => {
		querySlot(listRef.current, 'query-sortable', 'node-id', id)
			?.querySelector<HTMLElement>(':scope > [data-slot="query-reorder-handle"]')
			?.focus()
	}, [])

	const { liftedId, setLiftedId, onItemKeyDown, onItemBlur } = useKeyboardReorder({
		items: children,
		getKey,
		onReorder: (_next, id, index) => move(id, index),
		focusItem,
		itemName: name,
		stepFor,
	})

	const { order, sorting, setDraft, onDragStart, onDragEnd } = useReorderDrag({
		ids,
		onReorder: useCallback((next: string[], id: string) => move(id, next.indexOf(id)), [move]),
		name,
		// A pointer drag drops a keyboard lift.
		onStart: useCallback(() => setLiftedId(null), [setLiftedId]),
	})

	const describedBy = useId()

	// Motion's `MotionConfig` leaves `layout` animations running, so the nodes
	// read the preference themselves (WCAG 2.3.3).
	const instant = usePrefersReducedMotion()

	const byKey = new Map(children.map((child) => [child.id, child]))

	return (
		<>
			{/* `Reorder` renders the full `motion` element. A strict `LazyMotion` of a
			`ReducedMotion` root above the builder throws in development, so this
			`LazyMotion` is not strict. `Reorder` already loads each feature of `domMax`,
			so the bundle adds no code. */}
			<LazyMotion features={domMax}>
				<Reorder.Group
					ref={listRef}
					as="div"
					axis="y"
					values={order}
					onReorder={setDraft}
					data-slot="query-sortable-list"
					data-sorting={dataAttr(sorting)}
					className={cn(k.sortable.list)}
				>
					{order.flatMap((id, index) => {
						const child = byKey.get(id)

						if (child === undefined) return []

						const between = separator(index)

						return [
							between ? (
								// The separator keeps its slot through the drag, so it takes the
								// key of the node that the slot holds before the drag.
								<div key={`${children[index]?.id}-separator`} className={cn(k.sortable.separator)}>
									{between}
								</div>
							) : null,
							<QueryBuilderSortableItem
								key={id}
								id={id}
								label={name(id)}
								disabled={disabled}
								handle={children.length > 1}
								lifted={liftedId === id}
								describedBy={describedBy}
								instant={instant}
								onKeyDown={onItemKeyDown}
								onBlur={onItemBlur}
								onDragStart={onDragStart}
								onDragEnd={onDragEnd}
							>
								{node(child)}
							</QueryBuilderSortableItem>,
						]
					})}
				</Reorder.Group>
			</LazyMotion>
			<div hidden id={describedBy}>
				{LIFT_INSTRUCTIONS.draggable}
			</div>
		</>
	)
}
