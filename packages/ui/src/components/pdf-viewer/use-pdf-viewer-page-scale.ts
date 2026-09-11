'use client'

import { useMemo } from 'react'
import type { PdfViewerFit } from './types'
import { isRotationTransposed } from './use-pdf-viewer-page-rotation'

/** A measured or intrinsic box, in px. @internal */
type Size = { width: number; height: number }

/** Inputs to {@link usePdfViewerPageScale}. @internal */
type PageScaleOptions = {
	viewportSize: Size | null
	pageSize: Size | null
	/** Raw rotation in degrees for the active page; may be ≥ 360. Transposition is derived from it. */
	rotation: number
	zoom: number
	/** Drives whether the viewport reserves space. When false, `aspectRatio` is undefined and the viewer collapses. */
	hasContent: boolean
	/** How the page is scaled into the viewport before `zoom` multiplies it. */
	fit: PdfViewerFit
}

/** Computed layout returned by {@link usePdfViewerPageScale}: the scaled image size, the rotated frame size, the viewport aspect ratio, and the shared page transform. @internal */
export type PageScaleResult = {
	imageWidth: number | undefined
	imageHeight: number | undefined
	frameWidth: number | undefined
	frameHeight: number | undefined
	/**
	 * CSS `aspect-ratio` for the viewport. `8.5 / 11` (US Letter) is the pre-load fallback.
	 *
	 * @remarks Undefined under `fit: 'width'`: the ratio is what makes the viewport derive its
	 * height from its width, which is exactly what has to stop for the page to be able to
	 * overflow vertically.
	 */
	aspectRatio: string | undefined
	/**
	 * CSS `transform` centring a page-sized box in the frame and applying the rotation.
	 *
	 * @remarks Computed here, once, because more than one box wears it: the page image and
	 * every layer drawn over it (highlights today, a text layer later) have to sit in
	 * exactly the same place under exactly the same rotation. Two hand-written copies would
	 * make "the copies agree" something a test has to assert.
	 */
	transform: string
}

/**
 * CSS `aspect-ratio` for the viewport: the page's intrinsic ratio (swapped
 * when rotated), `8.5 / 11` (US Letter) before load, or undefined when the
 * viewer reserves no space or its height is the consumer's to set.
 *
 * @internal
 */
function resolvePageAspectRatio(
	hasContent: boolean,
	pageSize: Size | null,
	isTransposed: boolean,
	fit: PdfViewerFit,
): string | undefined {
	if (!hasContent || fit === 'width') return undefined

	if (!pageSize) return '8.5 / 11'

	return isTransposed
		? `${pageSize.height} / ${pageSize.width}`
		: `${pageSize.width} / ${pageSize.height}`
}

/**
 * Scale that lands the page inside the measured viewport before the user's zoom applies:
 * bounded by both axes under `'page'`, by width alone under `'width'` — which deliberately
 * ignores the measured height, because the page is meant to overflow it and scroll.
 *
 * `1` whenever there is nothing to measure against yet.
 *
 * @internal
 */
function resolveFitScale(
	viewportSize: Size | null,
	pageSize: Size | null,
	isTransposed: boolean,
	fit: PdfViewerFit,
): number {
	if (!viewportSize || !pageSize) return 1

	const visibleWidth = isTransposed ? pageSize.height : pageSize.width
	const visibleHeight = isTransposed ? pageSize.width : pageSize.height

	if (visibleWidth === 0 || visibleHeight === 0) return 1

	const toWidth = viewportSize.width / visibleWidth

	if (fit === 'width') return toWidth

	return Math.min(toWidth, viewportSize.height / visibleHeight)
}

/**
 * Derives the page image size, the rotated frame size, the viewport aspect ratio, and the
 * transform every co-transformed box wears, from the measured viewport, the intrinsic page
 * size, the rotation, and the user zoom.
 *
 * @returns The {@link PageScaleResult} layout for the active page.
 * @internal
 */
export function usePdfViewerPageScale(input: PageScaleOptions): PageScaleResult {
	const { viewportSize, pageSize, rotation, zoom, hasContent, fit } = input

	return useMemo(() => {
		const isTransposed = isRotationTransposed(rotation)

		const scale = resolveFitScale(viewportSize, pageSize, isTransposed, fit) * zoom

		const imageWidth = pageSize ? pageSize.width * scale : undefined
		const imageHeight = pageSize ? pageSize.height * scale : undefined

		const frameWidth = isTransposed ? imageHeight : imageWidth
		const frameHeight = isTransposed ? imageWidth : imageHeight

		const aspectRatio = resolvePageAspectRatio(hasContent, pageSize, isTransposed, fit)

		const transform = `translate(-50%, -50%) rotate(${rotation}deg)`

		return { imageWidth, imageHeight, frameWidth, frameHeight, aspectRatio, transform }
	}, [viewportSize, pageSize, rotation, zoom, hasContent, fit])
}
