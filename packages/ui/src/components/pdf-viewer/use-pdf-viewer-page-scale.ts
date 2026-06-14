'use client'

import { useMemo } from 'react'

/** Inputs to {@link usePdfViewerPageScale}. @internal */
type PageScaleOptions = {
	viewportSize: { width: number; height: number } | null
	pageSize: { width: number; height: number } | null
	/** True when the page is rotated 90° / 270°; swaps width and height in the layout. */
	isTransposed: boolean
	zoom: number
	/** Drives whether the viewport reserves space. When false, `aspectRatio` is undefined and the viewer collapses. */
	hasContent: boolean
}

/** Computed layout returned by {@link usePdfViewerPageScale}: the scaled image size, the rotated frame size, and the viewport aspect ratio. @internal */
export type PageScaleResult = {
	imageWidth: number | undefined
	imageHeight: number | undefined
	frameWidth: number | undefined
	frameHeight: number | undefined
	/** CSS `aspect-ratio` for the viewport. `8.5 / 11` (US Letter) is the pre-load fallback. */
	aspectRatio: string | undefined
}

/**
 * CSS `aspect-ratio` for the viewport: the page's intrinsic ratio (swapped
 * when rotated), `8.5 / 11` (US Letter) before load, or undefined when the
 * viewer reserves no space.
 *
 * @internal
 */
function resolvePageAspectRatio(
	hasContent: boolean,
	pageSize: { width: number; height: number } | null,
	isTransposed: boolean,
): string | undefined {
	if (!hasContent) return undefined

	if (!pageSize) return '8.5 / 11'

	return isTransposed
		? `${pageSize.height} / ${pageSize.width}`
		: `${pageSize.width} / ${pageSize.height}`
}

/**
 * Derives the page image size, the rotated frame size, and the viewport aspect
 * ratio from the measured viewport, the intrinsic page size, the rotation, and
 * the user zoom.
 *
 * @returns The {@link PageScaleResult} layout for the active page.
 * @internal
 */
export function usePdfViewerPageScale(input: PageScaleOptions): PageScaleResult {
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

		const imageWidth = pageSize ? pageSize.width * scale : undefined
		const imageHeight = pageSize ? pageSize.height * scale : undefined

		const frameWidth = isTransposed ? imageHeight : imageWidth
		const frameHeight = isTransposed ? imageWidth : imageHeight

		const aspectRatio = resolvePageAspectRatio(hasContent, pageSize, isTransposed)

		return { imageWidth, imageHeight, frameWidth, frameHeight, aspectRatio }
	}, [viewportSize, pageSize, isTransposed, zoom, hasContent])
}
