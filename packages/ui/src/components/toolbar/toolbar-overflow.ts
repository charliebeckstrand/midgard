/**
 * The attribute that marks an item that the row of a toolbar with More cannot
 * hold. The item is below the clip, and it is `inert`.
 * @internal
 */
export const OVERFLOW_ATTRIBUTE = 'data-overflow'

/**
 * The attribute that marks an item before the current page of a toolbar with
 * More. The item has no box, and it is `inert`.
 * @internal
 */
export const PAGED_ATTRIBUTE = 'data-paged'

/** The selector of the Back button and the More anchor, which the toolbar adds. @internal */
const OWN_SELECTOR = ':is([data-slot="toolbar-back"], [data-slot="toolbar-more"])'

/** The selector of a separator that is a direct child of the toolbar. @internal */
const SEPARATOR_SELECTOR = '[data-slot="toolbar-separator"]'

/** The items of the caller: the direct children of `toolbar`, less Back and More. @internal */
function callerItems(toolbar: HTMLElement): Element[] {
	return Array.from(toolbar.children).filter((child) => !child.matches(OWN_SELECTOR))
}

/**
 * Writes or removes `mark` on `item`, and `inert` with it. An item with
 * either mark is `inert`.
 * @internal
 */
function setMark(item: Element, mark: string, on: boolean): void {
	item.toggleAttribute(mark, on)

	item.toggleAttribute(
		'inert',
		item.hasAttribute(OVERFLOW_ATTRIBUTE) || item.hasAttribute(PAGED_ATTRIBUTE),
	)
}

/**
 * Marks the first `count` items of the caller with {@link PAGED_ATTRIBUTE},
 * and removes the mark from each other item. A paged item has no box, so the
 * row starts at the item after it.
 * @internal
 */
export function markPaged(toolbar: HTMLElement | null, count: number): void {
	if (!toolbar) return

	callerItems(toolbar).forEach((item, index) => {
		setMark(item, PAGED_ATTRIBUTE, index < count)
	})
}

/**
 * Marks each item of the caller that is not on the first row with
 * {@link OVERFLOW_ATTRIBUTE}, and removes the mark from each other item. The
 * More anchor is `inert` while no item is marked, because its button is then
 * above the clip.
 *
 * @remarks CSS fits the row (`kata/toolbar.ts`), so a wrapped row takes no
 * height. An item is thus on a wrapped row when its top is at or below the
 * bottom of the first child that has a box: Back, or the first item of the
 * page. The function reads one box for each item, and writes no layout.
 * @internal
 */
export function markOverflow(toolbar: HTMLElement | null): void {
	if (!toolbar) return

	const first = Array.from(toolbar.children).find((child) => child.getClientRects().length > 0)

	if (!first) return

	const rowBottom = first.getBoundingClientRect().bottom

	let hidden = false

	for (const item of callerItems(toolbar)) {
		const over =
			!item.hasAttribute(PAGED_ATTRIBUTE) &&
			item.getClientRects().length > 0 &&
			item.getBoundingClientRect().top >= rowBottom

		setMark(item, OVERFLOW_ATTRIBUTE, over)

		if (over) hidden = true
	}

	toolbar.querySelector(':scope > [data-slot="toolbar-more"]')?.toggleAttribute('inert', !hidden)
}

/**
 * The index of the item of the caller that starts the next page: the first
 * item below the row that is not a separator. A separator before it is paged
 * out with the page, so the next row starts with an item. It is -1 when each
 * item is on the row.
 * @internal
 */
export function nextPage(toolbar: HTMLElement): number {
	return callerItems(toolbar).findIndex(
		(item) => item.hasAttribute(OVERFLOW_ATTRIBUTE) && !item.matches(SEPARATOR_SELECTOR),
	)
}
