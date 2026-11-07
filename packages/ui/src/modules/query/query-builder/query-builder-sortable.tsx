'use client'

import { domMax, LazyMotion, Reorder } from 'motion/react'
import {
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
} from 'react'
import { announce } from '../../../core/announcer'
import { dataAttr } from '../../../core/data-attr'
import { querySlot } from '../../../core/query-slot'
import { logicalArrowKey } from '../../../hooks/a11y/logical-arrow'
import { useKeyboardReorder } from '../../../hooks/use-keyboard-reorder'
import { usePrefersReducedMotion } from '../../../hooks/use-prefers-reduced-motion'
import { useReorderDrag } from '../../../hooks/use-reorder-drag'
import { useStableEvent } from '../../../hooks/use-stable-event'
import { IntlMessage } from '../../../primitives/intl'
import { droppedText, movedText, reorderMessages } from '../../../primitives/intl/intl-reorder'
import { useIntl } from '../../../primitives/intl/use-intl'
import { k } from '../../../recipes/kata/query-builder'
import { hasBrowserModifier } from '../../../utilities/modifier-keys'
import { describeNode } from '../engine/query-announcements'
import { queryMessages } from '../engine/query-messages'
import { findNode } from '../engine/query-tree'
import type { QueryGroup, QueryNode } from '../engine/types'
import { useQueryBuilderActions, useQueryBuilderMove, useQueryBuilderState } from './context'
import { queryBuilderMessages } from './query-builder-messages'
import { findCarry, findDrop } from './query-builder-move'
import { QueryBuilderSortableItem } from './query-builder-sortable-item'

/** The slots of the query builder. */
const slots = k()

/** Props for {@link QueryBuilderSortable}. @internal */
type QueryBuilderSortableProps = {
	/** The group whose children reorder. */
	group: QueryGroup
	/** Whether the group is the root of the tree. */
	root?: boolean
	/** The index that a pointer drag from another group drops its node at here, or `null`. */
	dropIndex: number | null
	/** The AND/OR between the slot at the index and the slot before it, or nothing. */
	separator: (index: number) => ReactNode
	/** The rule or the nested group that a child renders. */
	node: (child: QueryNode) => ReactNode
}

/** The key of a node in its group's sortable list. @internal */
const getKey = (node: QueryNode) => node.id

/** The step of a key in the column of nodes, or `null` for a key off it. @internal */
const stepFor = (key: string) => (key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : null)

/** The mark of the node that a drop line borders: the line is above it or below it. @internal */
type DropMark = 'before' | 'after'

/**
 * The mark of the child at `index` for a drop at `dropIndex`. A drop before
 * the first child draws the line above it, and each other drop draws the line
 * below the child before the place.
 *
 * @internal
 */
function dropMark(index: number, dropIndex: number | null): DropMark | undefined {
	if (dropIndex === null) return undefined

	if (dropIndex === 0) return index === 0 ? 'before' : undefined

	return index === dropIndex - 1 ? 'after' : undefined
}

/**
 * The reorder of one group over Motion's `Reorder`: its children reorder with a
 * pointer or with the keyboard, and each change commits through the `move`
 * action. Each group is its own `Reorder.Group`. A node also moves into another
 * group through the `moveInto` action.
 *
 * @remarks
 * Only the grip starts a pointer drag. The nodes move in a draft order as the
 * pointer passes them, and the drop commits the move once. Escape, a
 * `pointercancel`, and a builder that turns disabled cancel the drag and put
 * the nodes back. With the keyboard, Space on a grip picks the
 * node up, each arrow key moves it one position, and Space, Enter, or Escape
 * drops it. Each step is announced by the summary text of the node and its
 * position in the group.
 *
 * The AND/OR separators belong to the slots, not to the nodes, because each
 * combinator keeps its position through a move. So a drag moves the nodes
 * between the separators.
 *
 * A pointer drag over another group drops the node into that group: the
 * height of the pointer finds the group and the place (`findDrop`). The group
 * then shows the drop and a line at the place, and the nodes of the group of
 * the node stop their draft moves, so the group under the pointer stays where
 * it is. With the keyboard, the arrow key toward the end of the line moves a
 * lifted node into the group just before it, as its last node, or else into
 * the group just after it, as its first node. The arrow key toward the start
 * of the line moves it out of its group, to the place after the group. The
 * group that then holds the node lifts it and focuses its grip. Under
 * `requireRule`, the sole node of a group does not leave it.
 *
 * @internal
 */
export function QueryBuilderSortable({
	group,
	root = false,
	dropIndex,
	separator,
	node,
}: QueryBuilderSortableProps) {
	const { fields, disabled, requireRule } = useQueryBuilderState()

	const { move, moveInto } = useQueryBuilderActions()

	const shared = useQueryBuilderMove()

	const intl = useIntl()

	const listRef = useRef<HTMLDivElement>(null)

	const children = group.children

	const ids = useMemo(() => children.map(getKey), [children])

	const name = useCallback(
		(id: string) => {
			const child = children.find((candidate) => candidate.id === id)

			return child === undefined ? '' : describeNode(intl, child, fields)
		},
		[children, fields, intl],
	)

	// The keyboard moves focus to the grip of a node. The ids are unique in the
	// tree, so the lookup cannot find a node of a nested group.
	const focusItem = useCallback((id: string) => {
		querySlot(listRef.current, 'query-sortable', 'node-id', id)
			?.querySelector<HTMLElement>(':scope > [data-slot="query-reorder-handle"]')
			?.focus()
	}, [])

	// Under `requireRule` a group keeps its last node.
	const leavable = !requireRule || children.length > 1

	// The name of a group in an announcement of a move into it.
	const groupName = useCallback(
		(target: QueryGroup) =>
			intl.formatMessage(
				target.id === shared.getRoot().id
					? queryBuilderMessages.topLevel
					: queryMessages.conditionGroup,
			),
		[intl, shared],
	)

	const { liftedId, setLiftedId, onItemKeyDown, onItemBlur } = useKeyboardReorder({
		items: children,
		getKey,
		onReorder: (_next, id, index) => move(id, index),
		focusItem,
		itemName: name,
		stepFor,
		enabled: !disabled,
	})

	// A move into another group. The group that then holds the node lifts it and
	// focuses its grip.
	const carry = (id: string, target: QueryGroup, index: number) => {
		setLiftedId(null)

		shared.carried.current = { id, groupId: target.id }

		moveInto(id, target.id, index)

		announce(
			movedText(intl, name(id), {
				position: index + 1,
				total: target.children.length + 1,
				container: groupName(target),
			}),
			{ assertive: true },
		)
	}

	const onKeyDown = useStableEvent((id: string, event: KeyboardEvent) => {
		const key = logicalArrowKey(event.key, event.currentTarget)

		const way = key === 'ArrowRight' ? 'in' : key === 'ArrowLeft' ? 'out' : null

		if (way === null || liftedId !== id || hasBrowserModifier(event) || event.shiftKey) {
			onItemKeyDown(id, event)

			return
		}

		event.preventDefault()

		const target = leavable ? findCarry(shared.getRoot(), id, way) : null

		if (target) carry(id, target.group, target.index)
	})

	// The group that a keyboard move carries a node into lifts it and focuses
	// its grip, so the next arrow key moves it on. The carry ends at the first
	// render of that group.
	useLayoutEffect(() => {
		const carried = shared.carried.current

		if (carried?.groupId !== group.id) return

		shared.carried.current = null

		if (!children.some((child) => child.id === carried.id)) return

		setLiftedId(carried.id)

		focusItem(carried.id)
	}, [children, group.id, shared, setLiftedId, focusItem])

	// Whether the live pointer drag is over another group. Then the nodes of
	// this group stop their draft moves.
	const crossing = useRef(false)

	const onDrop = useCallback(
		(id: string) => {
			const drop = shared.getDrop()

			const target = drop && findNode(shared.getRoot(), drop.groupId)

			if (!drop || target?.type !== 'group') return false

			const index = Math.min(drop.index, target.children.length)

			moveInto(id, target.id, index)

			announce(
				droppedText(intl, name(id), {
					position: index + 1,
					total: target.children.length + 1,
					container: groupName(target),
				}),
				{ assertive: true },
			)

			return true
		},
		[shared, moveInto, intl, name, groupName],
	)

	const { order, sorting, setDraft, onDragStart, onDragEnd } = useReorderDrag({
		ids,
		onReorder: useCallback((next: string[], id: string) => move(id, next.indexOf(id)), [move]),
		onDrop,
		name,
		// A pointer drag drops a keyboard lift.
		onStart: useCallback(() => setLiftedId(null), [setLiftedId]),
		enabled: !disabled,
	})

	const onDrag = useStableEvent((id: string, y: number) => {
		const item = querySlot(listRef.current, 'query-sortable', 'node-id', id)

		const drop = leavable && item ? findDrop(item, y) : null

		const was = crossing.current

		crossing.current = drop !== null

		shared.setDrop(drop)

		// Motion makes no draft move while the last one waits for a render of new
		// values. Over another group the draft does not take the moves, so back
		// over this group a new draft array lets Motion move the nodes again.
		if (was && drop === null) setDraft([...order])
	})

	const endDrag = useCallback(
		(event: Event) => {
			onDragEnd(event)

			crossing.current = false

			shared.setDrop(null)
		},
		[onDragEnd, shared],
	)

	const onDraft = useCallback(
		(next: string[]) => {
			if (!crossing.current) setDraft(next)
		},
		[setDraft],
	)

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
					onReorder={onDraft}
					data-slot="query-sortable-list"
					data-sorting={dataAttr(sorting)}
					className={slots.sortable.list}
				>
					{order.flatMap((id, index) => {
						const child = byKey.get(id)

						if (child === undefined) return []

						const between = separator(index)

						return [
							between ? (
								// The separator keeps its slot through the drag, so it takes the
								// key of the node that the slot holds before the drag.
								<div key={`${children[index]?.id}-separator`} className={slots.sortable.separator}>
									{between}
								</div>
							) : null,
							<QueryBuilderSortableItem
								key={id}
								id={id}
								label={name(id)}
								disabled={disabled}
								handle={children.length > 1 || (!root && leavable)}
								lifted={liftedId === id}
								drop={dropMark(index, dropIndex)}
								describedBy={describedBy}
								instant={instant}
								onKeyDown={onKeyDown}
								onBlur={onItemBlur}
								onDragStart={onDragStart}
								onDrag={onDrag}
								onDragEnd={endDrag}
							>
								{node(child)}
							</QueryBuilderSortableItem>,
						]
					})}
				</Reorder.Group>
			</LazyMotion>
			<div hidden id={describedBy}>
				<IntlMessage message={reorderMessages.liftInstructions} />
			</div>
		</>
	)
}
