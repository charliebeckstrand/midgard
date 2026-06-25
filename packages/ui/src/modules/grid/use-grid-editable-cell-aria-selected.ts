'use client'

import { type RefObject, useEffect } from 'react'

/**
 * Writes `aria-selected` on the owning `role="gridcell"` ancestor, exposing
 * range and multi-select state to assistive tech.
 *
 * The gridcell is the `<td>` (Grid applies the role through `cellProps`,
 * which is non-reactive), while live selection state only reaches the reactive
 * cell content. `ref` points at the content node; the attribute is written
 * imperatively on its `<td>`, which React leaves untouched; `aria-selected`
 * is not part of the `<td>`'s rendered props.
 */
export function useGridEditableCellAriaSelected(
	ref: RefObject<HTMLElement | null>,
	selected: boolean,
): void {
	useEffect(() => {
		ref.current?.closest('[role="gridcell"]')?.setAttribute('aria-selected', String(selected))
	}, [ref, selected])
}
