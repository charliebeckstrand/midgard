export type ScrollbarMode = 'auto' | 'visible' | 'hidden'

export type ThumbState = { size: number; offset: number; visible: boolean }

export const HIDDEN_THUMB: ThumbState = { size: 0, offset: 0, visible: false }

export const MIN_THUMB_SIZE = 20

export const SCROLL_FADE_DELAY_MS = 800

/**
 * Compute a thumb's size and offset along one axis from the viewport's scroll
 * metrics and the track's measured size. Returns `HIDDEN_THUMB` when the
 * content fits within the viewport or the track has no measurable size.
 */
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
