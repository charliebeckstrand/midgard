import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePdfViewerPageScale } from '../../components/pdf-viewer/use-pdf-viewer-page-scale'

const page = { width: 100, height: 200 }

type ScaleOverrides = Partial<Parameters<typeof usePdfViewerPageScale>[0]>

/**
 * Renders the hook with the common inputs, so each case names only what it varies.
 */
function renderScale(overrides: ScaleOverrides = {}) {
	return renderHook(() =>
		usePdfViewerPageScale({
			pageSize: page,
			rotation: 0,
			zoom: 1,
			fit: 'page',
			hasContent: true,
			reservedSize: { width: 612, height: 792 },
			...overrides,
		}),
	).result
}

describe('usePdfViewerPageScale', () => {
	it('falls back to the reserved size when content is present but page is unknown', () => {
		const result = renderScale({ pageSize: null })

		expect(result.current.aspectRatio).toBe('612 / 792')

		expect(result.current.frame.aspectRatio).toBe(`${612 / 792}`)
	})

	it('reserves the given size before the page size is known', () => {
		const result = renderScale({ pageSize: null, reservedSize: { width: 842, height: 595 } })

		expect(result.current.aspectRatio).toBe('842 / 595')

		expect(result.current.naturalWidth).toBeCloseTo((842 * 96) / 72)
	})

	it('takes the reserved size for a page with no area', () => {
		const result = renderScale({ pageSize: { width: 0, height: 0 } })

		expect(result.current.aspectRatio).toBe('612 / 792')

		expect(result.current.frame.aspectRatio).toBe(`${612 / 792}`)
	})

	it('omits aspectRatio when there is no content', () => {
		const result = renderScale({ hasContent: false })

		expect(result.current.aspectRatio).toBeUndefined()
	})

	it('fits the frame to the pane on the constraining axis', () => {
		const result = renderScale()

		// The container units of the pane: its width, or its height times the page ratio.
		expect(result.current.frame).toEqual({
			width: `calc(min(100cqw, 100cqh * ${0.5}) * 1)`,
			aspectRatio: `${0.5}`,
		})
	})

	it('applies zoom on top of the fit', () => {
		const result = renderScale({ zoom: 2 })

		expect(result.current.frame.width).toBe(`calc(min(100cqw, 100cqh * ${0.5}) * 2)`)
	})

	it('fills the frame with the page', () => {
		const result = renderScale()

		expect(result.current.page).toEqual({
			width: '100cqw',
			height: '100cqh',
			transform: 'translate(-50%, -50%) rotate(0deg)',
		})
	})

	it('swaps the page box and the ratios when transposed', () => {
		const result = renderScale({ rotation: 90 })

		// The unrotated page is as wide as the frame is tall.
		expect(result.current.page.width).toBe('100cqh')

		expect(result.current.page.height).toBe('100cqw')

		expect(result.current.frame.aspectRatio).toBe(`${page.height / page.width}`)

		expect(result.current.aspectRatio).toBe(`${page.height} / ${page.width}`)
	})

	it('carries the rotation, so the image and every layer over it wear one transform', () => {
		const result = renderScale({ rotation: 450 })

		// Raw degrees, not normalized: CSS handles ≥ 360, and the viewer counts rotations up.
		expect(result.current.page.transform).toBe('translate(-50%, -50%) rotate(450deg)')
	})
})

describe('usePdfViewerPageScale fit', () => {
	it('bounds the frame by width alone under fit="width", and withholds the aspect ratio', () => {
		const result = renderScale({ fit: 'width', zoom: 1.5 })

		// A percentage of the scroll box, whose content box excludes the reserved gutter.
		expect(result.current.frame.width).toBe('calc(100% * 1.5)')

		// Withheld so the viewport stops deriving its height from the page and can overflow.
		expect(result.current.aspectRatio).toBeUndefined()
	})

	it('keeps the visible ratio of the frame under fit="width"', () => {
		const result = renderScale({ fit: 'width', rotation: 90 })

		expect(result.current.frame.aspectRatio).toBe(`${page.height / page.width}`)
	})
})

describe('usePdfViewerPageScale naturalWidth', () => {
	it('converts the page points to CSS pixels at 96 px per inch', () => {
		const result = renderScale({ pointSize: { width: 612, height: 792 } })

		expect(result.current.naturalWidth).toBe(816)
	})

	it('takes the page height in points when the page is transposed', () => {
		const result = renderScale({ pointSize: { width: 612, height: 792 }, rotation: 90 })

		expect(result.current.naturalWidth).toBe(1056)
	})

	it('falls back to the page pixels when the page carries no points', () => {
		expect(renderScale().current.naturalWidth).toBe(100)

		expect(renderScale({ rotation: 270 }).current.naturalWidth).toBe(200)
	})

	it('ignores the fit scale and the zoom', () => {
		const result = renderScale({ zoom: 3, fit: 'width' })

		expect(result.current.naturalWidth).toBe(100)
	})

	it('falls back to US Letter before the page size is known', () => {
		expect(renderScale({ pageSize: null }).current.naturalWidth).toBe(816)
	})

	it('is undefined when the viewer has no content', () => {
		expect(renderScale({ hasContent: false }).current.naturalWidth).toBeUndefined()
	})
})
