import { isScrollOverflow } from './scroll-overflow'

/**
 * Walks up the DOM to find the nearest scrollable ancestor, or null. Reads the
 * overflow value with {@link isScrollOverflow}; stops at `<body>` and
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

		const canScrollY = isScrollOverflow(overflowY) && current.scrollHeight > current.clientHeight

		const canScrollX = isScrollOverflow(overflowX) && current.scrollWidth > current.clientWidth

		if (canScrollY || canScrollX) return current

		current = current.parentElement
	}

	return null
}
