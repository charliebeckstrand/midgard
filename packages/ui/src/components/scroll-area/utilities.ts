export type ScrollbarMode = 'auto' | 'visible' | 'hidden'

export type ThumbState = { size: number; offset: number; visible: boolean }

export const HIDDEN_THUMB: ThumbState = { size: 0, offset: 0, visible: false }

export const MIN_THUMB_SIZE = 20

export const SCROLL_FADE_DELAY_MS = 800

/** Computes thumb size and offset for one axis. Returns HIDDEN_THUMB when content fits. */
export function computeThumb(
	scrollPos: number,
	viewportSize: number,
	contentSize: number,
	trackSize: number,
): ThumbState {
	if (contentSize <= viewportSize || trackSize <= 0) return HIDDEN_THUMB

	const rawSize = (viewportSize / contentSize) * trackSize
	const size = Math.max(rawSize, MIN_THUMB_SIZE)
	const maxScroll = contentSize - viewportSize
	const maxOffset = trackSize - size
	const offset = maxScroll > 0 ? (scrollPos / maxScroll) * maxOffset : 0

	return { size, offset, visible: true }
}

/** Walks up the DOM to find the nearest scrollable ancestor, or null. */
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
