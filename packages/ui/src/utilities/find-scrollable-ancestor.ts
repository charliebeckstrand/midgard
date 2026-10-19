/**
 * Walks up the DOM to find the nearest scrollable ancestor, or null. Treats
 * `auto`, `scroll`, and `overlay` overflow as scrollable; stops at `<body>` and
 * `<html>`.
 *
 * @internal
 */
export function findScrollableAncestor(start: HTMLElement | null): HTMLElement | null {
	let current = start

	while (current && current !== document.body && current !== document.documentElement) {
		const style = getComputedStyle(current)

		const overflowY = style.overflowY
		const overflowX = style.overflowX

		const canScrollY =
			(overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
			current.scrollHeight > current.clientHeight

		const canScrollX =
			(overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay') &&
			current.scrollWidth > current.clientWidth

		if (canScrollY || canScrollX) return current

		current = current.parentElement
	}

	return null
}
