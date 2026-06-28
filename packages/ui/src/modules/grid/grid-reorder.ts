'use client'

import type { ClientRect, Modifier } from '@dnd-kit/core'
import { CSS, type Transform } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'
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
export const [GridReorderActiveContext] = createContext<string | null>('GridReorderActive', {
	default: null,
})

/** The CSS custom-property names carrying a reordering column's live translate and transition, keyed by its visible index. @internal */
function columnShiftVars(index: number): { x: string; transition: string } {
	return { x: `--grid-col-x-${index}`, transition: `--grid-col-transition-${index}` }
}

/**
 * Inline style for a reordering body cell: its column's live drag translate and
 * transition, read from the CSS variables the column's header writes (see
 * {@link writeColumnShift}). An idle column leaves the variables unset, so the
 * cell resolves to no transform. Keyed by the column's visible index, which a
 * header and the row cells beneath it share.
 *
 * @internal
 */
export function columnShiftStyle(index: number): CSSProperties {
	const vars = columnShiftVars(index)

	return {
		transform: `var(${vars.x}, none)`,
		transition: `var(${vars.transition}, none)`,
	}
}

/**
 * Writes (or clears) a reordering column's translate and transition onto the
 * `table` element as the CSS variables {@link columnShiftStyle} reads, so the
 * column's body cells glide with its header without re-rendering. A `null`
 * `transform` — the column is idle or its header is unmounting — removes them.
 *
 * @internal
 */
export function writeColumnShift(
	table: HTMLElement | null,
	index: number,
	transform: Transform | null,
	transition: string | undefined,
): void {
	if (!table) return

	const vars = columnShiftVars(index)

	if (transform) {
		table.style.setProperty(vars.x, CSS.Translate.toString(transform) || 'none')

		table.style.setProperty(vars.transition, transition ?? '')
	} else {
		table.style.removeProperty(vars.x)

		table.style.removeProperty(vars.transition)
	}
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
