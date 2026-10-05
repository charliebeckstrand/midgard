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
	/** The page size in points (1/72 in), when the page carries it. Sets {@link PageScaleResult.naturalWidth}. */
	pointSize?: Size | null
	/** Raw rotation in degrees for the active page; can be ≥ 360. Transposition is derived from it. */
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
	 * @remarks Undefined under `fit: 'width'`. The ratio is what makes the viewport derive its
	 * height from its width. That is exactly what has to stop for the page to
	 * overflow vertically.
	 */
	aspectRatio: string | undefined
	/**
	 * The CSS width of the visible page at 100%, before the fit scale and the zoom. It is the
	 * viewport width when the host sizes to its content.
	 *
	 * @remarks The fitted frame takes its width from the measured viewport. Thus the frame cannot
	 * give the viewport a width: in a box that sizes to its content (for example `w-max`), the
	 * viewport keeps the width that it had before the page loaded. This width stops that loop.
	 * A flexible viewport in a box with a width of its own ignores it.
	 *
	 * The width comes from the page points at 96 px per inch, then from the page pixels.
	 * `816` (8.5 in, US Letter) is the pre-load fallback. Undefined when the viewer
	 * reserves no space.
	 */
	naturalWidth: number | undefined
	/**
	 * CSS `transform` centering a page-sized box in the frame and applying the rotation.
	 *
	 * @remarks Computed here, once, because more than one box wears it. The page image and
	 * every layer drawn over it have to sit in exactly the same place, under exactly
	 * the same rotation. Those layers are the highlights today, and a text layer
	 * later. Two hand-written copies would
	 * make "the copies agree" something a test has to assert.
	 */
	transform: string
}

/**
 * CSS `aspect-ratio` for the viewport:
 *
 * - the page's intrinsic ratio, swapped when rotated;
 * - `8.5 / 11` (US Letter) before load;
 * - undefined when the viewer reserves no space, or its height is the
 *   consumer's to set.
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

/** CSS pixels for each PDF point: 96 px and 72 pt to the inch. */
const PX_PER_POINT = 96 / 72

/** The pre-load fallback width: US Letter, 8.5 in at 96 px per inch. */
const LETTER_WIDTH = 816

/**
 * CSS width of the visible page at 100%. See {@link PageScaleResult.naturalWidth}.
 *
 * @internal
 */
function resolveNaturalWidth(
	hasContent: boolean,
	pageSize: Size | null,
	pointSize: Size | null,
	isTransposed: boolean,
): number | undefined {
	if (!hasContent) return undefined

	if (pointSize && pointSize.width > 0 && pointSize.height > 0) {
		return (isTransposed ? pointSize.height : pointSize.width) * PX_PER_POINT
	}

	if (pageSize && pageSize.width > 0 && pageSize.height > 0) {
		return isTransposed ? pageSize.height : pageSize.width
	}

	return LETTER_WIDTH
}

/**
 * Scale that lands the page inside the measured viewport before the user's zoom applies.
 * It is bounded by both axes under `'page'`, and by width alone under `'width'`. The
 * width bound deliberately ignores the measured height, because the page is meant to
 * overflow it and scroll.
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
 * transform every co-transformed box wears. It reads the measured viewport, the intrinsic
 * page size, the rotation, and the user zoom.
 *
 * @returns The {@link PageScaleResult} layout for the active page.
 * @internal
 */
export function usePdfViewerPageScale(input: PageScaleOptions): PageScaleResult {
	const { viewportSize, pageSize, pointSize = null, rotation, zoom, hasContent, fit } = input

	return useMemo(() => {
		const isTransposed = isRotationTransposed(rotation)

		const scale = resolveFitScale(viewportSize, pageSize, isTransposed, fit) * zoom

		const imageWidth = pageSize ? pageSize.width * scale : undefined
		const imageHeight = pageSize ? pageSize.height * scale : undefined

		const frameWidth = isTransposed ? imageHeight : imageWidth
		const frameHeight = isTransposed ? imageWidth : imageHeight

		const aspectRatio = resolvePageAspectRatio(hasContent, pageSize, isTransposed, fit)

		const naturalWidth = resolveNaturalWidth(hasContent, pageSize, pointSize, isTransposed)

		const transform = `translate(-50%, -50%) rotate(${rotation}deg)`

		return {
			imageWidth,
			imageHeight,
			frameWidth,
			frameHeight,
			aspectRatio,
			naturalWidth,
			transform,
		}
	}, [viewportSize, pageSize, pointSize, rotation, zoom, hasContent, fit])
}
