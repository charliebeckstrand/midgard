import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePdfViewerPageScale } from '../../components/pdf-viewer/use-pdf-viewer-page-scale'

const viewport = { width: 800, height: 600 }
const page = { width: 100, height: 200 }

describe('usePdfViewerPageScale', () => {
	it('returns undefined dimensions when pageSize is null', () => {
		const { result } = renderHook(() =>
			usePdfViewerPageScale({
				viewportSize: viewport,
				pageSize: null,
				isTransposed: false,
				zoom: 1,
				hasContent: true,
			}),
		)

		expect(result.current.imageW).toBeUndefined()
		expect(result.current.imageH).toBeUndefined()
	})

	it('falls back to 8.5 / 11 aspect when content is present but page is unknown', () => {
		const { result } = renderHook(() =>
			usePdfViewerPageScale({
				viewportSize: viewport,
				pageSize: null,
				isTransposed: false,
				zoom: 1,
				hasContent: true,
			}),
		)

		expect(result.current.aspectRatio).toBe('8.5 / 11')
	})

	it('omits aspectRatio when there is no content', () => {
		const { result } = renderHook(() =>
			usePdfViewerPageScale({
				viewportSize: viewport,
				pageSize: page,
				isTransposed: false,
				zoom: 1,
				hasContent: false,
			}),
		)

		expect(result.current.aspectRatio).toBeUndefined()
	})

	it('fits the page to the viewport on the constraining axis', () => {
		// viewport 800x600, page 100x200 → fitScale = min(8, 3) = 3
		const { result } = renderHook(() =>
			usePdfViewerPageScale({
				viewportSize: viewport,
				pageSize: page,
				isTransposed: false,
				zoom: 1,
				hasContent: true,
			}),
		)

		expect(result.current.imageW).toBe(300)
		expect(result.current.imageH).toBe(600)
	})

	it('applies zoom on top of fitScale', () => {
		const { result } = renderHook(() =>
			usePdfViewerPageScale({
				viewportSize: viewport,
				pageSize: page,
				isTransposed: false,
				zoom: 2,
				hasContent: true,
			}),
		)

		expect(result.current.imageW).toBe(600)
		expect(result.current.imageH).toBe(1200)
	})

	it('swaps frame width and height when transposed', () => {
		const { result } = renderHook(() =>
			usePdfViewerPageScale({
				viewportSize: viewport,
				pageSize: page,
				isTransposed: true,
				zoom: 1,
				hasContent: true,
			}),
		)

		// frameW takes the image height; aspectRatio swaps too
		expect(result.current.frameW).toBe(result.current.imageH)
		expect(result.current.frameH).toBe(result.current.imageW)
		expect(result.current.aspectRatio).toBe(`${page.height} / ${page.width}`)
	})
})
