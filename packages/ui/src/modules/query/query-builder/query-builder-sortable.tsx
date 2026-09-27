'use client'

import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { type ReactNode, useRef } from 'react'
import { cn, dataAttr } from '../../../core'
import { restrictToVerticalAxis, useSortableList } from '../../../hooks/use-sortable-list'
import { k } from '../../../recipes/kata/query-builder'
import { describeNode } from '../engine/query-announcements'
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
const modifiers = [restrictToVerticalAxis]

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
		// Each step names the node by its summary text and its position.
		describe: (node) => describeNode(node, fields),
	})

	return (
		<DndContext {...dndContextProps} modifiers={modifiers}>
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
