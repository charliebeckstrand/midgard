import type { ClientRect, Modifier } from '@dnd-kit/core'
import type { Transform } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'
import type { GridReorder } from '../grid-data-types'

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
 * scroll width. That extension is what let horizontal auto-scroll run away.
 * Auto-scroll now traverses the real columns, and halts at the last one. Mirrors
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
 * dnd-kit modifier that keeps a drag within its parent element — the dragged
 * node can't be pulled past either end of its container. Used by the row manager
 * so a group zone stays inside the list rather than dragging off infinitely.
 * Mirrors `@dnd-kit/modifiers`' `restrictToParentElement`.
 *
 * @internal
 */
export const restrictToParentElement: Modifier = ({
	containerNodeRect,
	draggingNodeRect,
	transform,
}) => {
	if (!draggingNodeRect || !containerNodeRect) return transform

	return clampToBoundingRect(transform, draggingNodeRect, containerNodeRect)
}

/** The CSS custom-property name carrying a reordering column's live translate, keyed by its visible index. @internal */
export function columnShiftVar(index: number): string {
	return `--grid-col-x-${index}`
}

/**
 * Inline style for a reordering cell — a header or a body cell. Reads its
 * column's live translate from the CSS variable the column's header animates (see
 * {@link useColumnReorderShift}). An idle column leaves it unset, so the cell
 * resolves to no shift. Keyed by the column's visible index, which a header and
 * the row cells beneath it share, so they move as one. Only the x translate is
 * taken — never dnd-kit's `scaleX` / `scaleY`, which would stretch cell content.
 *
 * @internal
 */
export function columnShiftStyle(index: number): CSSProperties {
	return { transform: `translateX(var(${columnShiftVar(index)}, 0px))` }
}

/**
 * Completes a column order. The ids of `columns` that `order` does not hold
 * append at the end, in column order, which is where the engine shows an id
 * that its order does not name. A stale or partial order (a stored order, or
 * columns added after mount) then gives every walk the full set.
 *
 * @returns `order` itself when it holds every column id, else a new list.
 * @internal
 */
export function completeColumnOrder(
	order: (string | number)[],
	columns: readonly { id: string | number }[],
): (string | number)[] {
	const seen = new Set(order)

	const missing = columns.filter((column) => !seen.has(column.id)).map((column) => column.id)

	return missing.length === 0 ? order : [...order, ...missing]
}

/**
 * Splices a reordered subset of column ids back into the full column order.
 * Every id the `isReorderable` predicate rejects (selection, actions, pinned, or
 * hidden columns) holds its existing slot.
 *
 * Shared by the column-manager list and the header drag handles, so both commit
 * identical orderings. Each walks the full `order`, and draws the next id from
 * `reorderedIds` in sequence wherever a slot is reorderable.
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
			// A slot with no id left to draw keeps its own, so the order never holds
			// `undefined` when the two lengths disagree.
			next.push(reorderedIds[idx] ?? id)

			idx++
		} else {
			next.push(id)
		}
	}

	return next
}

/**
 * Resolves the {@link GridReorder} prop to its two flags: `enabled` gates the
 * reorder wiring, `handle` picks the grip vs. whole-header drag affordance. The
 * boolean shorthand keeps the grip; the object form is the opt-in (`enabled`
 * true) and defaults `handle` to `true`.
 *
 * @internal
 */
export function resolveGridReorder(reorder: boolean | GridReorder): {
	enabled: boolean
	handle: boolean
} {
	if (typeof reorder === 'boolean') return { enabled: reorder, handle: true }

	return { enabled: true, handle: reorder.handle ?? true }
}
