import type { ToolbarOrientation } from './types'

/** The attribute that marks a separator at the start or the end of a wrapped row. @internal */
export const ROW_EDGE_ATTRIBUTE = 'data-row-edge'

/** The selector of a separator that is a direct child of the toolbar. @internal */
const SEPARATOR_SELECTOR = '[data-slot="toolbar-separator"]'

/** The box of a direct child of the toolbar, from the one read pass. @internal */
type ItemBox = { el: Element; top: number; bottom: number; separator: boolean }

/**
 * Marks each `ToolbarSeparator` that starts or ends a row of a wrapped toolbar
 * with {@link ROW_EDGE_ATTRIBUTE}, and removes the mark from each other one.
 *
 * @remarks
 * The function reads the boxes of all direct children first, and then writes.
 * Thus it causes one layout, not one for each item. An item starts a new row
 * when its top is at or below the bottom of the current row. This test uses
 * the block axis only, so it is the same in LTR and RTL. A child that has no
 * box (`display: none` or `display: contents`) is not an item.
 *
 * A vertical toolbar does not wrap, and a horizontal toolbar on one row has no
 * row edge. In these two cases, the function removes the marks and stops
 * before it reads each item.
 *
 * The mark hides the separator with `visibility: hidden`, which keeps its box.
 * Thus the mark does not change the rows that it comes from.
 *
 * @internal
 */
export function markRowEdges(toolbar: HTMLElement | null, orientation: ToolbarOrientation): void {
	if (!toolbar) return

	const separators = toolbar.querySelectorAll(`:scope > ${SEPARATOR_SELECTOR}`)

	if (separators.length === 0) return

	const edges = orientation === 'horizontal' && wraps(toolbar) ? rowEdges(toolbar) : undefined

	for (const separator of separators) {
		if (edges?.has(separator)) separator.setAttribute(ROW_EDGE_ATTRIBUTE, '')
		else separator.removeAttribute(ROW_EDGE_ATTRIBUTE)
	}
}

/** The direct children of `toolbar` that have a box. @internal */
function boxedChildren(toolbar: HTMLElement): Element[] {
	return Array.from(toolbar.children).filter((el) => el.getClientRects().length > 0)
}

/**
 * True when the boxed children of `toolbar` take more than one row: the last
 * one starts at or below the bottom of the first. It reads two boxes only.
 * @internal
 */
function wraps(toolbar: HTMLElement): boolean {
	const children = boxedChildren(toolbar)

	const first = children[0]

	const last = children.at(-1)

	if (!first || !last || first === last) return false

	return last.getBoundingClientRect().top >= first.getBoundingClientRect().bottom
}

/** The separators of `toolbar` that end a row or start the next one. Reads only. @internal */
function rowEdges(toolbar: HTMLElement): Set<Element> {
	const items: ItemBox[] = boxedChildren(toolbar).map((el) => {
		const { top, bottom } = el.getBoundingClientRect()

		return { el, top, bottom, separator: el.matches(SEPARATOR_SELECTOR) }
	})

	const edges = new Set<Element>()

	let rowBottom = Number.NEGATIVE_INFINITY

	items.forEach((item, index) => {
		const previous = items[index - 1]

		if (previous && item.top >= rowBottom) {
			if (previous.separator) edges.add(previous.el)

			if (item.separator) edges.add(item.el)

			rowBottom = item.bottom
		} else {
			rowBottom = Math.max(rowBottom, item.bottom)
		}
	})

	return edges
}
