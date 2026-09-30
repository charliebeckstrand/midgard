import { NEW_ROW_ADD_COLUMN_ID } from './grid-new-row-column'

/**
 * The height that a sticky header lays over the top edge of the scroll
 * container, or zero when the header does not stick. It is the one source of
 * the top inset for the cursor, the new-row slot, and the windowed body.
 *
 * @remarks Each header row reads its first cell, because the cells of a row
 * stick together. A row covers down to its sticky `top` plus its height. The
 * column row of a grid with column groups sticks below the band, so the inset
 * is the full height of the head.
 *
 * @internal
 */
export function stickyHeadInset(table: HTMLTableElement): number {
	let inset = 0

	for (const row of table.tHead?.rows ?? []) {
		const cell = row.cells[0]

		if (!cell) continue

		const style = getComputedStyle(cell)

		if (style.position !== 'sticky' || style.top === 'auto') continue

		const top = Number.parseFloat(style.top) || 0

		inset = Math.max(inset, top + row.getBoundingClientRect().height)
	}

	return inset
}

/**
 * The insets that the grid's own sticky chrome would lay over a cell scrolled to
 * the viewport edge. The top inset is the height that the sticky header covers
 * (see {@link stickyHeadInset}). The side insets are the pinned columns' widths,
 * measured from the first header row's sticky cells.
 * The new-row slot of an editable grid sticks too. Its height adds to the top
 * or the bottom inset of each other cell (see {@link slotInsets}). The width
 * of its Add cell adds to the side inset of the other cells of the slot. Applied as
 * the active cell's `scroll-margin` so `scrollIntoView` keeps it clear of that
 * chrome (WCAG 2.4.11, Focus Not Obscured). Zero on every side for a grid with
 * neither, so the margin is cleared.
 *
 * @remarks Read fresh on each activation rather than cached, at O(cols)
 * `getComputedStyle`, human-paced per keystroke. The insets shift on any resize,
 * pin, or density change. A stale value would scroll the cell under the very
 * chrome it is meant to clear (WCAG 2.4.11). A cache would need a layout-invalidation signal
 * this hook does not have, so correctness is kept over a micro-optimization.
 *
 * @internal
 */
export function obscuringInsets(cell: HTMLElement): {
	top: number
	bottom: number
	left: number
	right: number
} {
	const table = cell.closest('table')

	const headRow = table?.querySelector<HTMLElement>('thead > tr')

	const sides = { left: 0, right: 0 }

	if (headRow) for (const headCell of headRow.children) addSideInset(sides, headCell)

	// The Add cell of the new-row slot sticks to the inline end of its own row
	// alone, so it covers only the other cells of that row.
	const add = cell.parentElement?.querySelector(
		`:scope > [data-grid-new-col="${NEW_ROW_ADD_COLUMN_ID}"]`,
	)

	if (add && add !== cell) addSideInset(sides, add)

	return { ...stickyEdgeInsets(cell), ...sides }
}

/**
 * Adds the width of `element` to the side inset that it covers, when it
 * sticks to a side edge. A pinned cell overlays one physical side. Its offset
 * is a logical inset, but the computed `left` or `right` is physical. The top
 * edge comes from `stickyHeadInset`, which reads each header row.
 * @internal
 */
function addSideInset(sides: { left: number; right: number }, element: Element): void {
	const style = getComputedStyle(element)

	if (style.position !== 'sticky') return

	const width = element.getBoundingClientRect().width

	if (style.left !== 'auto') sides.left += width
	else if (style.right !== 'auto') sides.right += width
}

/**
 * The height that the grid's sticky chrome lays over the top and the bottom edge
 * of the scroll container. The element is part of the grid, outside the new-row slot.
 * The top is the sticky header (see {@link stickyHeadInset}) plus a top slot, and
 * the bottom is a bottom slot (see {@link slotInsets}). The cursor clears the
 * active cell of it, and the windowed body pads its alignment by it.
 *
 * @param stickyHead - Whether to read the header. A caller that knows the header
 * does not stick passes `false`, and skips the computed-style reads.
 * @internal
 */
export function stickyEdgeInsets(
	element: HTMLElement,
	stickyHead = true,
): { top: number; bottom: number } {
	const table = element.closest('table')

	const head = table && stickyHead ? stickyHeadInset(table) : 0

	const slot = slotInsets(element)

	return { top: head + slot.top, bottom: slot.bottom }
}

/**
 * The height that the sticky new-row slot lays over the top or the bottom edge
 * of the scroll container, for a cell outside the slot. The slot is the one of
 * this table, not of a grid nested in a detail row. @internal
 */
function slotInsets(cell: HTMLElement): { top: number; bottom: number } {
	// The body sections of the table are few, so the walk reads a handful of
	// elements, not the rows of the data body.
	const bodies = cell.closest('table')?.tBodies ?? []

	const slot = Array.from(bodies).find((body) => body.dataset.slot === 'grid-new-row-body')?.rows[0]

	if (!slot || slot.contains(cell)) return { top: 0, bottom: 0 }

	const height = slot.getBoundingClientRect().height

	return slot.dataset.position === 'top' ? { top: height, bottom: 0 } : { top: 0, bottom: height }
}

/**
 * Whether the horizontal correction of {@link clearStickyChrome} applies to
 * `cell`. A cell of a pinned column is the chrome itself, so it takes none. A
 * cell of the new-row slot sticks only to the top or the bottom edge, so it
 * takes one. A pinned column sticks to a logical inset, and its computed
 * `left` or `right` is physical. The correction therefore holds in a
 * right-to-left grid too.
 * @internal
 */
function clearsSides(cell: HTMLElement): boolean {
	const style = getComputedStyle(cell)

	return !(style.position === 'sticky' && (style.left !== 'auto' || style.right !== 'auto'))
}

/**
 * Scrolls the grid's own scroll container so the cell clears the sticky chrome
 * at each edge. It runs after the cell's `scrollIntoView`. Chromium's
 * `nearest` alignment does not scroll a cell that is inside the container, on
 * either axis. It therefore ignores the `scroll-margin` of a cell under the
 * sticky header or under a pinned column. A cell of a nested grid with no
 * scroll container of its own is not moved.
 *
 * @remarks The side edges take a correction only where a pinned column can
 * cover the cell (see {@link clearsSides}).
 *
 * @internal
 */
export function clearStickyChrome(
	cell: HTMLElement,
	insets: { top: number; bottom: number; left: number; right: number },
): void {
	const table = cell.closest('table')

	const scroller = table?.closest<HTMLElement>('[data-slot="grid-scroll"]')

	if (!scroller || scroller.querySelector('table') !== table) return

	const box = scroller.getBoundingClientRect()

	const edgeTop = box.top + scroller.clientTop + insets.top

	const edgeBottom = box.top + scroller.clientTop + scroller.clientHeight - insets.bottom

	const rect = cell.getBoundingClientRect()

	// The top edge wins for a cell taller than the clear area.
	if (rect.top < edgeTop) scroller.scrollTop -= edgeTop - rect.top
	else if (rect.bottom > edgeBottom)
		scroller.scrollTop += Math.min(rect.bottom - edgeBottom, rect.top - edgeTop)

	if (!clearsSides(cell)) return

	const edgeLeft = box.left + scroller.clientLeft + insets.left

	const edgeRight = box.left + scroller.clientLeft + scroller.clientWidth - insets.right

	// The left edge wins for a cell wider than the clear area.
	if (rect.left < edgeLeft) scroller.scrollLeft -= edgeLeft - rect.left
	else if (rect.right > edgeRight)
		scroller.scrollLeft += Math.min(rect.right - edgeRight, rect.left - edgeLeft)
}

/**
 * Sets a `scroll-margin` side of `cell` to `inset` pixels, or clears it at
 * zero. A value that does not change is not written, because each write sets
 * the `style` attribute again. @internal
 */
export function setScrollMargin(
	cell: HTMLElement,
	side: 'scrollMarginTop' | 'scrollMarginBottom' | 'scrollMarginLeft' | 'scrollMarginRight',
	inset: number,
): void {
	const value = inset ? `${inset}px` : ''

	if (cell.style[side] !== value) cell.style[side] = value
}
