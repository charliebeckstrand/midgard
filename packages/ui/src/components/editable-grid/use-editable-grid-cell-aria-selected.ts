'use client'

import { type RefObject, useEffect } from 'react'

/**
 * Reflects a cell's live selection onto its owning `role="gridcell"` ancestor's
 * `aria-selected`, so range / multi-select reaches assistive tech.
 *
 * The gridcell is the `<td>` (DataTable applies the role through `cellProps`,
 * which is intentionally kept non-reactive so navigation doesn't rebuild every
 * column), while the live selection state only reaches the reactive cell
 * content. This hook bridges that seam: `ref` points at the content node and
 * the attribute is written imperatively on its `<td>`. React leaves it
 * untouched — `aria-selected` isn't part of the `<td>`'s rendered props, so the
 * reconciler never patches it.
 */
export function useEditableGridCellAriaSelected(
	ref: RefObject<HTMLElement | null>,
	selected: boolean,
): void {
	useEffect(() => {
		ref.current?.closest('[role="gridcell"]')?.setAttribute('aria-selected', String(selected))
	}, [ref, selected])
}
