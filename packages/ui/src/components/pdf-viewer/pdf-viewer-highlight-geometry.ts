import type { PdfViewerHighlightRect, PdfViewerHighlightUnit, PdfViewerPage } from './types'

/** PDF user-space units per inch. A point is 1/72", by definition of the PDF coordinate system. */
const POINTS_PER_INCH = 72

/**
 * Converts one region's box into fractions of the page.
 *
 * @param rect - The region's box, in `unit`.
 * @param unit - What `rect` is expressed in.
 * @param page - The page the region sits on; supplies the divisor for a physical unit.
 * @returns The box in `[0, 1]` page fractions, or `null` when `unit` is physical and the
 * page carries no extent to divide by — the caller renders nothing rather than guessing a
 * page size.
 * @remarks A `'fraction'` rect is returned as-is, identity included: the canonical path
 * allocates nothing.
 *
 * Pure, and exported for that reason: it is the one seam where this arithmetic is
 * provable without a measured DOM, which jsdom cannot give.
 */
export function toFractionRect(
	rect: PdfViewerHighlightRect,
	unit: PdfViewerHighlightUnit,
	page: PdfViewerPage | undefined,
): PdfViewerHighlightRect | null {
	if (unit === 'fraction') return rect

	const { pointWidth, pointHeight } = page ?? {}

	if (!pointWidth || !pointHeight) return null

	const widthInInches = pointWidth / POINTS_PER_INCH
	const heightInInches = pointHeight / POINTS_PER_INCH

	return {
		x: rect.x / widthInInches,
		y: rect.y / heightInInches,
		width: rect.width / widthInInches,
		height: rect.height / heightInInches,
	}
}
