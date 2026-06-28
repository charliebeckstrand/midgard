'use client'

import type { ClientRect, Modifier } from '@dnd-kit/core'
import type { Transform } from '@dnd-kit/utilities'
import { type AnimationPlaybackControls, animate } from 'motion'
import { useReducedMotion } from 'motion/react'
import { type CSSProperties, type RefObject, useLayoutEffect } from 'react'
import { createContext } from '../../core'

/**
 * dnd-kit modifier that pins a column drag to the x-axis: zeroes the vertical
 * component of the transform so a column tracks the pointer horizontally and
 * never drifts up or down while being reordered. Mirrors `@dnd-kit/modifiers`'
 * `restrictToHorizontalAxis` without taking the dependency.
 *
 * @internal
 */
export const restrictToHorizontalAxis: Modifier = ({ transform }) => ({
	...transform,
	y: 0,
})

/**
 * Clamps `transform` so `rect` stays inside `bounding` on both axes. Lifted from
 * `@dnd-kit/modifiers`' internal `restrictToBoundingRect`.
 *
 * @internal
 */
function clampToBoundingRect(
	transform: Transform,
	rect: ClientRect,
	bounding: ClientRect,
): Transform {
	const value = { ...transform }

	if (rect.top + transform.y <= bounding.top) {
		value.y = bounding.top - rect.top
	} else if (rect.bottom + transform.y >= bounding.top + bounding.height) {
		value.y = bounding.top + bounding.height - rect.bottom
	}

	if (rect.left + transform.x <= bounding.left) {
		value.x = bounding.left - rect.left
	} else if (rect.right + transform.x >= bounding.left + bounding.width) {
		value.x = bounding.left + bounding.width - rect.right
	}

	return value
}

/**
 * dnd-kit modifier that keeps a column drag within its first scrollable
 * ancestor — the table's horizontal-scroll wrapper. Bounding the dragged cell
 * to the visible container stops its transform from extending the table's
 * scroll width, which is what let horizontal auto-scroll run away: now
 * auto-scroll traverses the real columns and halts at the last one. Mirrors
 * `@dnd-kit/modifiers`' `restrictToFirstScrollableAncestor`.
 *
 * @internal
 */
export const restrictToFirstScrollableAncestor: Modifier = ({
	draggingNodeRect,
	transform,
	scrollableAncestorRects,
}) => {
	const containerRect = scrollableAncestorRects[0]

	if (!draggingNodeRect || !containerRect) return transform

	return clampToBoundingRect(transform, draggingNodeRect, containerRect)
}

/**
 * The id of the column being drag-reordered, or `null` when idle. Provided by
 * the grid around the sortable region and read by each reordering body cell so
 * only the dragged column's cells carry the `data-dragging` lift. The value
 * changes just at drag start and end — the per-frame translate rides a CSS
 * variable instead (see {@link columnShiftStyle}), so a drag re-renders the body
 * cells twice, not on every pointer move.
 *
 * @internal
 */
export const [GridReorderContext] = createContext<string | null>('GridReorder', {
	default: null,
})

/** The CSS custom-property name carrying a reordering column's live translate, keyed by its visible index. @internal */
function columnShiftVar(index: number): string {
	return `--grid-col-x-${index}`
}

/**
 * Inline style for a reordering cell — a header or a body cell. Reads its
 * column's live translate from the CSS variable the column's header animates (see
 * {@link useColumnReorderShift}); an idle column leaves it unset, so the cell
 * resolves to no shift. Keyed by the column's visible index, which a header and
 * the row cells beneath it share, so they move as one. Only the x translate is
 * taken — never dnd-kit's `scaleX` / `scaleY`, which would stretch cell content.
 *
 * @internal
 */
export function columnShiftStyle(index: number): CSSProperties {
	return { transform: `translateX(var(${columnShiftVar(index)}, 0px))` }
}

/** Snappy, lightly-damped spring for the shift glide — settles fast with a touch of give, not a bounce. @internal */
const SHIFT_SPRING = { type: 'spring', stiffness: 600, damping: 38 } as const

/**
 * Drives a reordering column's shift onto the CSS variable {@link columnShiftStyle}
 * reads, so the whole column — its header and every body cell — moves from one
 * variable without re-rendering a cell. The actively dragged column tracks the
 * pointer 1:1 (a spring would lag the cursor); every other column springs to its
 * target via `motion`, so the make-room shifts glide instead of snapping. Reduced
 * motion snaps all of them straight to target (WCAG 2.3.3).
 *
 * @param tableRef - The enclosing `<table>` the variable lives on; it cascades to the column's cells.
 * @param index - The column's visible index, keying its variable.
 * @param x - The column's target horizontal translate in px (0 when idle).
 * @param isDragging - Whether this is the actively dragged column.
 * @internal
 */
export function useColumnReorderShift(
	tableRef: RefObject<HTMLTableElement | null>,
	index: number,
	x: number,
	isDragging: boolean,
): void {
	const reduceMotion = useReducedMotion()

	useLayoutEffect(() => {
		const table = tableRef.current

		if (!table) return

		// Every write goes through motion so it owns the variable: a direct style
		// write would fight motion's render loop, which keeps applying the value it
		// last animated and drops the write. The dragged column — and reduced
		// motion — jump instantly (duration 0); every other column springs to make
		// room.
		const controls: AnimationPlaybackControls = animate(
			table,
			{ [columnShiftVar(index)]: `${x}px` },
			isDragging || reduceMotion ? { duration: 0 } : SHIFT_SPRING,
		)

		return () => controls.stop()
	}, [tableRef, index, x, isDragging, reduceMotion])
}

/**
 * Splices a reordered subset of column ids back into the full column order,
 * holding every id the `isReorderable` predicate rejects (selection, actions,
 * pinned, or hidden columns) in its existing slot.
 *
 * Shared by the column-manager list and the header drag handles so both commit
 * identical orderings: each walks the full `order` and, wherever a slot is
 * reorderable, draws the next id from `reorderedIds` in sequence.
 *
 * @param order - Full column order: every column id, in display order.
 * @param reorderedIds - The reorderable ids in their new relative order; its
 * length must equal the number of reorderable slots in `order`.
 * @param isReorderable - Marks which ids participate in the reorder.
 * @returns The next full order with reorderable slots repermuted and every other
 * id held in place.
 * @internal
 */
export function applyColumnReorder(
	order: (string | number)[],
	reorderedIds: (string | number)[],
	isReorderable: (id: string | number) => boolean,
): (string | number)[] {
	const next: (string | number)[] = []

	let idx = 0

	for (const id of order) {
		if (isReorderable(id)) {
			next.push(reorderedIds[idx] as string | number)

			idx++
		} else {
			next.push(id)
		}
	}

	return next
}
