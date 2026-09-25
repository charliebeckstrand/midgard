'use client'

import { type Announcements, DndContext, type Modifier } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { type ReactNode, useMemo, useRef } from 'react'
import { cn, dataAttr } from '../../../core'
import { useGrabbingCursor, useSortableList } from '../../../hooks'
import { k } from '../../../recipes/kata/query-builder'
import {
	describeDragCancel,
	describeDragEnd,
	describeDragOver,
	describeDragStart,
	describeNode,
} from '../engine/query-announcements'
import type { QueryGroup, QueryNode } from '../engine/types'
import { useQueryBuilderActions, useQueryBuilderState } from './context'

/** Props for {@link QueryBuilderSortable}. @internal */
type QueryBuilderSortableProps = {
	/** The group whose children reorder. */
	group: QueryGroup
	children: ReactNode
}

/** The key of a node in its group's sortable list. @internal */
const getKey = (node: QueryNode) => node.id

/** Holds a drag on the vertical axis, because the children of a group are a column. @internal */
const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 })

/**
 * The drag context of one group: its children reorder with a pointer or with
 * the keyboard, and each drop commits through the `move` action. Each group has
 * its own context, so a node moves only among its siblings.
 *
 * @remarks With the keyboard, Space or Enter on a grip picks the node up. The
 * arrow keys move it, Space or Enter drops it, and Escape cancels the move.
 * Each step is announced by its position in the group.
 *
 * @internal
 */
export function QueryBuilderSortable({ group, children }: QueryBuilderSortableProps) {
	const { fields, disabled } = useQueryBuilderState()

	const { move } = useQueryBuilderActions()

	// The node that the drag carries. A drop reports the next order, and the
	// node's position in that order is its target index.
	const dragged = useRef<string | null>(null)

	const { itemIds, strategy, activeId, dndContextProps } = useSortableList({
		items: group.children,
		getKey,
		disabled,
		onReorder: (next) => {
			const id = dragged.current

			if (id !== null)
				move(
					id,
					next.findIndex((node) => node.id === id),
				)
		},
		onDragStart: (node) => {
			dragged.current = node.id
		},
		onDragEnd: () => {
			dragged.current = null
		},
	})

	// The hand stays closed while the pointer leaves the grip during a drag.
	useGrabbingCursor(activeId !== null)

	// The announcements name a node by its summary text and its position, never
	// by its generated id, which is what dnd-kit reads out by default.
	const announcements = useMemo<Announcements>(() => {
		const total = group.children.length

		const label = (id: string | number) => {
			const node = group.children.find((child) => child.id === String(id))

			return node ? describeNode(node, fields) : 'the node'
		}

		const position = (id: string | number) => itemIds.indexOf(String(id)) + 1

		return {
			onDragStart: ({ active }) => describeDragStart(label(active.id), position(active.id), total),
			onDragOver: ({ active, over }) =>
				over ? describeDragOver(label(active.id), position(over.id), total) : undefined,
			onDragEnd: ({ active, over }) =>
				describeDragEnd(label(active.id), position((over ?? active).id), total),
			onDragCancel: ({ active }) =>
				describeDragCancel(label(active.id), position(active.id), total),
		}
	}, [group.children, fields, itemIds])

	return (
		<DndContext
			{...dndContextProps}
			modifiers={[restrictToVerticalAxis]}
			accessibility={{ announcements }}
		>
			<SortableContext items={itemIds} strategy={strategy}>
				<div
					data-slot="query-sortable-list"
					data-sorting={dataAttr(activeId !== null)}
					className={cn(k.sortable.list)}
				>
					{children}
				</div>
			</SortableContext>
		</DndContext>
	)
}
