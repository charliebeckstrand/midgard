import type { ClientRect, Modifier } from '@dnd-kit/core'
import { CSS, type Transform } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'

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
 * Inline style for a cell that belongs to a reordering column — its header and
 * every body cell. Applies a horizontal-only translate via
 * `CSS.Translate.toString` (not `CSS.Transform`, whose `scaleX`/`scaleY` would
 * stretch a cell's content when columns differ in width) plus the sortable's
 * transition, so the whole column glides as one. The dragged column's
 * "lifted" cue lives in the recipe's `data-dragging` hook.
 *
 * @param transform - The sortable transform for this column, or `null` when idle.
 * @param transition - The sortable transition string, or `undefined`.
 * @param width - Optional fixed column width to preserve while dragging.
 * @returns The cell's inline style.
 * @internal
 */
export function columnDragStyle(
	transform: Transform | null,
	transition: string | undefined,
	width?: string,
): CSSProperties {
	return {
		transform: CSS.Translate.toString(transform),
		transition,
		...(width ? { width } : null),
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
