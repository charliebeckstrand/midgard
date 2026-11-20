'use client'

import { useCallback } from 'react'
import { noop } from '../../utilities/noop'

/**
 * Gives the cache the width of the page on screen, from the frame of the page.
 *
 * @param sizeRaster - Gives the width to the cache, or `null` for pages that a caller supplies.
 * @param transposed - Whether the page shows rotated by 90 or 270 degrees. The width of the
 * page is then the height of the frame.
 * @returns The ref callback of the frame.
 * @remarks CSS sizes the frame, so only a `ResizeObserver` knows its size. The observer gives
 * the width to the cache and does not set state. Thus a resize of the viewport, for example
 * each frame of a rail that slides open, does not render the viewer again.
 * @internal
 */
export function usePdfViewerRasterWidth(
	sizeRaster: ((width: number) => () => void) | null,
	transposed: boolean,
): (frame: HTMLElement | null) => (() => void) | undefined {
	return useCallback(
		(frame: HTMLElement | null) => {
			if (!frame || !sizeRaster) return

			let withdraw = noop

			const observer = new ResizeObserver(([entry]) => {
				if (!entry) return

				const { width, height } = entry.contentRect

				withdraw = sizeRaster(transposed ? height : width)
			})

			observer.observe(frame)

			return () => {
				observer.disconnect()

				withdraw()
			}
		},
		[sizeRaster, transposed],
	)
}
