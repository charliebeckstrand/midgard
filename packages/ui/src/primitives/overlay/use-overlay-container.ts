'use client'

import { useBreakpointFrame } from '../breakpoint-frame/context'

/**
 * The container of an overlay: `container` when it is given, else the
 * element of the nearest viewport frame, else `undefined` for the viewport.
 * In a viewport frame, an overlay thus covers the frame, as an overlay on a
 * page covers the window.
 *
 * @param container - The `container` of the overlay.
 * @returns The element that the overlay covers, or `undefined` for the viewport.
 *
 * @internal
 */
export function useOverlayContainer(container: HTMLElement | null | undefined) {
	const frame = useBreakpointFrame()

	return container ?? (frame?.viewport ? frame.element : undefined)
}
