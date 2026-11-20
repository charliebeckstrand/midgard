'use client'

import { type CSSProperties, useMemo } from 'react'
import type { PdfViewerFit } from './types'
import { isRotationTransposed } from './use-pdf-viewer-page-rotation'

/** A measured or intrinsic box, in px. @internal */
type Size = { width: number; height: number }

/** Inputs to {@link usePdfViewerPageScale}. @internal */
type PageScaleOptions = {
	pageSize: Size | null
	/** The page size in points (1/72 in), when the page carries it. Sets {@link PageScaleResult.naturalWidth}. */
	pointSize?: Size | null
	/**
	 * The page size in points that the viewer reserves while it does not know the size of the
	 * page: the `pageSize` of the viewer, else US Letter.
	 */
	reservedSize: Size
	/** Raw rotation in degrees for the active page; can be ≥ 360. Transposition is derived from it. */
	rotation: number
	zoom: number
	/** Drives whether the viewport reserves space. When false, `aspectRatio` is undefined and the viewer collapses. */
	hasContent: boolean
	/** How the page is scaled into the viewport before `zoom` multiplies it. */
	fit: PdfViewerFit
}

/**
 * The CSS layout returned by {@link usePdfViewerPageScale}: the viewport aspect ratio and
 * width, the frame box, and the page box that every co-transformed box wears.
 *
 * @remarks The styles size the page in CSS units, and no measurement of the viewport sets
 * them. Thus the server paints the page at its final size, and a resize of the viewport does
 * not render the viewer again.
 * @internal
 */
export type PageScaleResult = {
	/**
	 * CSS `aspect-ratio` for the viewport. The reserved size gives it before the page size is known.
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
	 * @remarks The viewport is a size container, so its content cannot give it a width. In a
	 * box that sizes to its content (for example `w-max`), this width gives it one. A flexible
	 * viewport in a box with a width of its own ignores it.
	 *
	 * The width comes from the page points at 96 px per inch, then from the page pixels, then
	 * from the reserved size. Undefined when the viewer reserves no space.
	 */
	naturalWidth: number | undefined
	/**
	 * CSS of the page frame: the width that fits the visible page into the viewport, times the
	 * zoom, and the aspect ratio of the visible page.
	 *
	 * @remarks Under `fit: 'page'`, the width reads the container units of the viewport pane.
	 * The pane does not scroll, so a scrollbar that comes and goes with a zoomed page does not
	 * change the fit. Under `fit: 'width'`, the width is a percentage of the scroll box, whose
	 * content box excludes the reserved gutter.
	 */
	frame: CSSProperties
	/**
	 * CSS of the page image and of every layer drawn over it: the box of the unrotated page in
	 * the container units of the frame, and the transform that centers it and applies the
	 * rotation.
	 *
	 * @remarks Computed here, once, because more than one box wears it. The page image and
	 * every layer drawn over it have to sit in exactly the same place, under exactly
	 * the same rotation. Those layers are the highlights and the search hits. Two
	 * hand-written copies would make "the copies agree" something a test has to assert.
	 */
	page: CSSProperties
}

/**
 * CSS `aspect-ratio` for the viewport:
 *
 * - the page's intrinsic ratio, swapped when rotated;
 * - the ratio of the reserved size before the page size is known;
 * - undefined when the viewer reserves no space, or its height is the
 *   consumer's to set.
 *
 * @internal
 */
function resolveAspectRatio(
	hasContent: boolean,
	{ width, height }: Size,
	transposed: boolean,
	fit: PdfViewerFit,
): string | undefined {
	if (!hasContent || fit === 'width') return undefined

	return transposed ? `${height} / ${width}` : `${width} / ${height}`
}

/** CSS pixels for each PDF point: 96 px and 72 pt to the inch. */
const PX_PER_POINT = 96 / 72

/**
 * CSS width of the visible page at 100%. See {@link PageScaleResult.naturalWidth}.
 *
 * @internal
 */
function resolveNaturalWidth(
	hasContent: boolean,
	pageSize: Size | null,
	pointSize: Size | null,
	reservedSize: Size,
	transposed: boolean,
): number | undefined {
	if (!hasContent) return undefined

	if (pointSize && pointSize.width > 0 && pointSize.height > 0) {
		return (transposed ? pointSize.height : pointSize.width) * PX_PER_POINT
	}

	if (pageSize && pageSize.width > 0 && pageSize.height > 0) {
		return transposed ? pageSize.height : pageSize.width
	}

	return (transposed ? reservedSize.height : reservedSize.width) * PX_PER_POINT
}

/**
 * The width of the frame that lands the visible page inside the viewport, times the zoom.
 * It is bounded by both axes under `'page'`, and by width alone under `'width'`. The
 * width bound deliberately ignores the height, because the page is meant to overflow it
 * and scroll.
 *
 * @param ratio - The width over the height of the visible page.
 * @internal
 */
function resolveFrameWidth(ratio: number, zoom: number, fit: PdfViewerFit): string {
	if (fit === 'width') return `calc(100% * ${zoom})`

	return `calc(min(100cqw, 100cqh * ${ratio}) * ${zoom})`
}

/**
 * Derives the CSS that sizes the page: the viewport aspect ratio and width, the frame box,
 * and the box and transform that every co-transformed box wears. It reads the intrinsic
 * page size, the rotation, and the user zoom.
 *
 * @returns The {@link PageScaleResult} layout for the active page.
 * @internal
 */
export function usePdfViewerPageScale(input: PageScaleOptions): PageScaleResult {
	const { pageSize, pointSize = null, reservedSize, rotation, zoom, hasContent, fit } = input

	return useMemo(() => {
		const transposed = isRotationTransposed(rotation)

		// A page with no area has no ratio, so it takes the reserved size.
		const box = pageSize && pageSize.width > 0 && pageSize.height > 0 ? pageSize : reservedSize

		const { width, height } = box

		const ratio = transposed ? height / width : width / height

		const frame: CSSProperties = {
			width: resolveFrameWidth(ratio, zoom, fit),
			aspectRatio: `${ratio}`,
		}

		const page: CSSProperties = {
			width: transposed ? '100cqh' : '100cqw',
			height: transposed ? '100cqw' : '100cqh',
			transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
		}

		return {
			aspectRatio: resolveAspectRatio(hasContent, box, transposed, fit),
			naturalWidth: resolveNaturalWidth(hasContent, pageSize, pointSize, reservedSize, transposed),
			frame,
			page,
		}
	}, [pageSize, pointSize, reservedSize, rotation, zoom, hasContent, fit])
}
