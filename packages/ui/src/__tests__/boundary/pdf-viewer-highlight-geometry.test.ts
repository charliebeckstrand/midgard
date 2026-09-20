import { describe, expect, it } from 'vitest'
import { toFractionRect } from '../../components/pdf-viewer/pdf-viewer-highlight-geometry'
import type { PdfViewerPage } from '../../components/pdf-viewer/types'

const rect = { x: 1, y: 2, width: 3, height: 4 }

// 612 × 792 pt is US Letter — 8.5 × 11 inches, at 72 pt to the inch.
const letter: PdfViewerPage = { src: 'page-1.png', pointWidth: 612, pointHeight: 792 }

describe('toFractionRect', () => {
	it('returns a fraction rect untouched, identity included', () => {
		expect(toFractionRect(rect, 'fraction', letter)).toBe(rect)
	})

	it('needs no page at all for a fraction rect', () => {
		expect(toFractionRect(rect, 'fraction', undefined)).toBe(rect)
	})

	it('divides inches by the page extent in inches', () => {
		expect(toFractionRect({ x: 2.125, y: 2.75, width: 4.25, height: 5.5 }, 'inch', letter)).toEqual(
			{ x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
		)
	})

	it('scales each axis by its own extent, not one shared divisor', () => {
		// Same inch value on both axes lands at different fractions on a non-square page.
		const converted = toFractionRect({ x: 4.25, y: 4.25, width: 0, height: 0 }, 'inch', letter)

		expect(converted?.x).toBe(0.5)

		expect(converted?.y).toBeCloseTo(0.386, 3)
	})

	it('returns null for inches when the page carries no extent', () => {
		expect(toFractionRect(rect, 'inch', { src: 'page-1.png' })).toBeNull()
	})

	it('returns null for inches when there is no page at all', () => {
		expect(toFractionRect(rect, 'inch', undefined)).toBeNull()
	})

	it('returns null rather than dividing by a zero extent', () => {
		expect(
			toFractionRect(rect, 'inch', { src: 'page-1.png', pointWidth: 0, pointHeight: 0 }),
		).toBeNull()
	})
})
