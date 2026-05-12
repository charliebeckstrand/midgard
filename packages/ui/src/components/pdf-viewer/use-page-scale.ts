'use client'

import { useMemo } from 'react'

export type UsePageScaleInput = {
	viewportSize: { width: number; height: number } | null
	pageSize: { width: number; height: number } | null
	/** True when the page is rotated 90° / 270°; swaps width and height in the layout. */
	isTransposed: boolean
	zoom: number
	/** Drives whether the viewport reserves space. When false, `aspectRatio` is undefined so the viewer can collapse. */
	hasContent: boolean
}

export type UsePageScaleResult = {
	imageW: number | undefined
	imageH: number | undefined
	frameW: number | undefined
	frameH: number | undefined
	/** CSS `aspect-ratio` for the viewport. `8.5 / 11` (US Letter) is the pre-load fallback. */
	aspectRatio: string | undefined
}

/**
 * Derives the page image size, the rotated frame size, and the viewport aspect
 * ratio from the measured viewport, the intrinsic page size, the rotation, and
 * the user zoom.
 */
export function usePageScale(input: UsePageScaleInput): UsePageScaleResult {
	const { viewportSize, pageSize, isTransposed, zoom, hasContent } = input

	return useMemo(() => {
		const fitScale = (() => {
			if (!viewportSize || !pageSize) return 1

			const visW = isTransposed ? pageSize.height : pageSize.width
			const visH = isTransposed ? pageSize.width : pageSize.height

			if (visW === 0 || visH === 0) return 1

			return Math.min(viewportSize.width / visW, viewportSize.height / visH)
		})()

		const scale = fitScale * zoom

		const imageW = pageSize ? pageSize.width * scale : undefined
		const imageH = pageSize ? pageSize.height * scale : undefined

		const frameW = isTransposed ? imageH : imageW
		const frameH = isTransposed ? imageW : imageH

		const aspectRatio = !hasContent
			? undefined
			: pageSize
				? isTransposed
					? `${pageSize.height} / ${pageSize.width}`
					: `${pageSize.width} / ${pageSize.height}`
				: '8.5 / 11'

		return { imageW, imageH, frameW, frameH, aspectRatio }
	}, [viewportSize, pageSize, isTransposed, zoom, hasContent])
}
