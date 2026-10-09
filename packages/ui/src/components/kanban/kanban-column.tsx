'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { type ReactNode, useCallback, useId, useMemo, useState } from 'react'
import { cn, dataAttr } from '../../core'
import { useDevWarning } from '../../hooks/use-dev-warning'
import { k } from '../../recipes/kata/kanban'
import { KanbanColumnContext, useKanbanContext, useKanbanDragState } from './context'

// One frozen array for every column that names nothing, so a mis-keyed column
// does not mint a new identity per render and miss the memo below.
const NO_ITEMS: string[] = []

/** Props for {@link KanbanColumn}: the `value` matching a board column, with an optional accessible-name override. */
export type KanbanColumnProps = {
	/** Stable key matching an entry in the `columns` prop; the keyed-child `value` every compound in the library takes. */
	value: string
	children?: ReactNode
	className?: string
	/** Explicit name for the column group. Defaults to the rendered `KanbanColumnTitle`. */
	'aria-label'?: string
}

/**
 * Drop target and sortable context for one board column, keyed by `value`. It
 * provides column context to its cards and title. It is a named group, a
 * `<fieldset>`, and not a landmark: the board is the one region of the board.
 * It takes its name from a mounted {@link KanbanColumnTitle}, or from an
 * explicit `aria-label`. Compose {@link KanbanColumnHeader} and
 * {@link KanbanColumnBody} within.
 *
 * The column highlights while a dragged card from another column is in it,
 * after the live move on drag-over. The column that the drag started in does
 * not highlight.
 *
 * @remarks Client component.
 */
export function KanbanColumn({
	value: columnId,
	children,
	className,
	'aria-label': ariaLabel,
}: KanbanColumnProps) {
	const { interactive } = useKanbanContext()

	const { dropColumnId, columnItemIds } = useKanbanDragState()

	const known = columnItemIds[columnId]

	const itemIds = known ?? NO_ITEMS

	// The board takes its columns as data and its structure as children, so the
	// same key is written twice and nothing joins them. A key that names no
	// column silently renders an empty group that takes no drop.
	useDevWarning(
		known === undefined,
		`Kanban: <KanbanColumn value="${columnId}"> names no column in the board's \`columns\`. The column renders, takes no drop, and holds no cards.`,
	)

	const { setNodeRef } = useDroppable({ id: columnId, disabled: !interactive })

	const titleId = useId()

	const [hasTitle, setHasTitle] = useState(false)

	const registerTitle = useCallback(() => {
		setHasTitle(true)

		return () => setHasTitle(false)
	}, [])

	// The card key check is a development diagnostic, so production carries no
	// ids and this value's identity never follows the board's data. `Kanban`
	// states that the card-facing cascade holds still through a drag, and
	// `KanbanCard` is memoized on that.
	const knownIds = process.env.NODE_ENV === 'production' ? NO_ITEMS : itemIds

	const value = useMemo(
		() => ({ columnId, registerTitle, titleId, itemIds: knownIds }),
		[columnId, registerTitle, titleId, knownIds],
	)

	return (
		<KanbanColumnContext value={value}>
			<SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
				{/* A named section is a region landmark, and each column then adds one more
				    landmark to the page. A fieldset is a group, which keeps the name for
				    the announcements and adds no landmark. `min-w-0` in the recipe replaces
				    the min-content width floor of a fieldset. */}
				<fieldset
					ref={setNodeRef}
					data-slot="kanban-column"
					data-column-id={columnId}
					data-over={dataAttr(columnId === dropColumnId)}
					// Names the column from its rendered title; an explicit aria-label
					// wins, and the reference appears only while a title is mounted.
					aria-label={ariaLabel}
					aria-labelledby={!ariaLabel && hasTitle ? titleId : undefined}
					className={cn(k.column.base, className)}
				>
					{children}
				</fieldset>
			</SortableContext>
		</KanbanColumnContext>
	)
}
