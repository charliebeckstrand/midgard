import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePdfViewerPageScale } from '../../components/pdf-viewer/use-pdf-viewer-page-scale'

const viewport = { width: 800, height: 600 }

const page = { width: 100, height: 200 }

/** A tall page in a wide viewport: fit-page is bounded by height, fit-width is not. */
const tall = { width: 100, height: 400 }

type ScaleOverrides = Partial<Parameters<typeof usePdfViewerPageScale>[0]>

/**
 * Renders the hook with the common inputs, so each case names only what it varies.
 */
function renderScale(overrides: ScaleOverrides = {}) {
	return renderHook(() =>
		usePdfViewerPageScale({
			viewportSize: viewport,
			pageSize: page,
			rotation: 0,
			zoom: 1,
			fit: 'page',
			hasContent: true,
			...overrides,
		}),
	).result
}

describe('usePdfViewerPageScale', () => {
	it('returns undefined dimensions when pageSize is null', () => {
		const result = renderScale({ pageSize: null })

		expect(result.current.imageWidth).toBeUndefined()

		expect(result.current.imageHeight).toBeUndefined()
	})

	it('falls back to 8.5 / 11 aspect when content is present but page is unknown', () => {
		const result = renderScale({ pageSize: null })

		expect(result.current.aspectRatio).toBe('8.5 / 11')
	})

	it('omits aspectRatio when there is no content', () => {
		const result = renderScale({ hasContent: false })

		expect(result.current.aspectRatio).toBeUndefined()
	})

	it('fits the page to the viewport on the constraining axis', () => {
		// viewport 800x600, page 100x200 → fitScale = min(8, 3) = 3
		const result = renderScale()

		expect(result.current.imageWidth).toBe(300)

		expect(result.current.imageHeight).toBe(600)
	})

	it('applies zoom on top of fitScale', () => {
		const result = renderScale({ zoom: 2 })

		expect(result.current.imageWidth).toBe(600)

		expect(result.current.imageHeight).toBe(1200)
	})

	it('swaps frame width and height when transposed', () => {
		const result = renderScale({ rotation: 90 })

		// frameWidth takes the image height; aspectRatio swaps too
		expect(result.current.frameWidth).toBe(result.current.imageHeight)

		expect(result.current.frameHeight).toBe(result.current.imageWidth)

		expect(result.current.aspectRatio).toBe(`${page.height} / ${page.width}`)
	})

	it('carries the rotation, so the image and every layer over it wear one transform', () => {
		const result = renderScale({ rotation: 450 })

		// Raw degrees, not normalized: CSS handles ≥ 360, and the viewer counts rotations up.
		expect(result.current.transform).toBe('translate(-50%, -50%) rotate(450deg)')
	})
})

describe('usePdfViewerPageScale fit', () => {
	it('bounds the page by both axes under fit="page"', () => {
		const result = renderScale({ pageSize: tall })

		// min(800/100, 600/400) = 1.5
		expect(result.current.imageWidth).toBe(150)

		expect(result.current.imageHeight).toBe(600)
	})

	it('bounds the page by width alone under fit="width", and withholds the aspect ratio', () => {
		const result = renderScale({ pageSize: tall, fit: 'width' })

		// 800/100 = 8, and the height that falls out is four times the viewport's.
		expect(result.current.imageWidth).toBe(800)

		expect(result.current.imageHeight).toBe(3200)

		// Withheld so the viewport stops deriving its height from the page and can overflow.
		expect(result.current.aspectRatio).toBeUndefined()
	})

	it('fits the rotated width when the page is transposed', () => {
		const result = renderScale({ pageSize: tall, rotation: 90, fit: 'width' })

		// Transposed, the visible width is the page's height: 800/400 = 2.
		expect(result.current.imageWidth).toBe(200)

		expect(result.current.frameWidth).toBe(800)
	})
})
