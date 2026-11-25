import type { Orientation } from '../../types/orientation'

/**
 * The attribute that marks a separator at a row edge of a wrapped toolbar. Its
 * value is `start` for a separator that starts a row, and `end` for a
 * separator that ends a row. @internal
 */
export const ROW_EDGE_ATTRIBUTE = 'data-row-edge'

/** The selector of a separator that is a direct child of the toolbar. @internal */
const SEPARATOR_SELECTOR = '[data-slot="toolbar-separator"]'

/**
 * Marks each `ToolbarSeparator` that starts or ends a row of a wrapped toolbar
 * with {@link ROW_EDGE_ATTRIBUTE}, and removes the mark from each other one.
 *
 * @remarks
 * Each mark hides the separator with `visibility: hidden`, which keeps its
 * box. The `start` mark also moves the item after the separator back over the
 * box and the gap, so that the item starts the row at the edge of the toolbar.
 * The mark does not change the row of the separator, because the row of an
 * item comes only from the items before it. But the row of the separator gets
 * more space, so the rows after it can change.
 *
 * Thus the function first removes each mark. Then it reads the box of each
 * direct child in document order, and it writes the mark of a separator when
 * it finds its row edge. A read after a `start` mark gets the new layout, so
 * each mark comes from the rows above it. The function causes one layout, and
 * one more for each `start` mark. An item starts a new row when its top is at
 * or below the bottom of the current row. After a `start` mark, the bottom of
 * the row is the bottom of the separator, read again: alone on its row, the
 * separator has no height. This test uses the block axis only,
 * so it is the same in LTR and RTL. A child that has no box (`display: none`
 * or `display: contents`) is not an item.
 *
 * A vertical toolbar does not wrap, and a horizontal toolbar on one row has no
 * row edge. In these two cases, the function stops before it reads each item.
 *
 * @internal
 */
export function markRowEdges(toolbar: HTMLElement | null, orientation: Orientation): void {
	if (!toolbar) return

	const separators = toolbar.querySelectorAll(`:scope > ${SEPARATOR_SELECTOR}`)

	if (separators.length === 0) return

	for (const separator of separators) separator.removeAttribute(ROW_EDGE_ATTRIBUTE)

	if (orientation !== 'horizontal') return

	const items = Array.from(toolbar.children).filter((el) => el.getClientRects().length > 0)

	if (!wraps(items)) return

	let rowBottom = Number.NEGATIVE_INFINITY

	items.forEach((item, index) => {
		const prev = items[index - 1]

		const { top, bottom } = item.getBoundingClientRect()

		if (prev && top >= rowBottom) {
			if (prev.matches(SEPARATOR_SELECTOR)) prev.setAttribute(ROW_EDGE_ATTRIBUTE, 'end')

			if (item.matches(SEPARATOR_SELECTOR)) {
				item.setAttribute(ROW_EDGE_ATTRIBUTE, 'start')

				// The mark can move the next item onto this row, and the separator
				// stretches to the new height of the row. So the row is read again.
				rowBottom = item.getBoundingClientRect().bottom
			} else {
				rowBottom = bottom
			}
		} else {
			rowBottom = Math.max(rowBottom, bottom)
		}
	})
}

/**
 * True when `items` take more than one row: the last one starts at or below
 * the bottom of the first. It reads two boxes only.
 * @internal
 */
function wraps(items: Element[]): boolean {
	const first = items[0]

	const last = items.at(-1)

	if (!first || !last || first === last) return false

	return last.getBoundingClientRect().top >= first.getBoundingClientRect().bottom
}
