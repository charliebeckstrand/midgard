import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PdfViewerHighlight, PdfViewerPage } from '../../components/pdf-viewer/types'
import { usePdfViewerHighlights } from '../../components/pdf-viewer/use-pdf-viewer-highlights'
import { noop } from '../helpers'

// The hook takes the document as arguments, so these are the whole of what a case needs: no
// `<PdfViewer>`, no context stub, and no rasterizer. Each test names the one decision it is
// about; the layer that draws from these is covered in `pdf-viewer.test.tsx`.

/** US Letter: 850 × 1100 rasterized pixels, 612 × 792 points. */
const letter: PdfViewerPage = {
	id: 'a',
	src: 'page-1.png',
	width: 850,
	height: 1100,
	pointWidth: 612,
	pointHeight: 792,
}

/** The same page, rasterized but never measured: an inch rect has nothing to divide by. */
const unmeasured: PdfViewerPage = { id: 'a', src: 'page-1.png', width: 850, height: 1100 }

/** The one prop the navigate-latch case varies between renders; `null` is a real value of it. */
type ActiveIdProps = { activeHighlightId: string | null }

const highlights: PdfViewerHighlight[] = [
	{
		id: 'total',
		page: 1,
		rect: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
		label: 'Total charges',
	},
	{
		id: 'tax',
		page: 1,
		rect: { x: 0.1, y: 0.3, width: 0.3, height: 0.05 },
		label: 'Tax',
		color: 'blue',
	},
	{ id: 'pro', page: 2, rect: { x: 0.5, y: 0.6, width: 0.2, height: 0.05 }, label: 'PRO number' },
]

describe('usePdfViewerHighlights', () => {
	it('returns the regions of the page on screen, in the order the caller gave them', () => {
		const { result } = renderHook(() =>
			usePdfViewerHighlights({ highlights, activePage: letter, safePage: 1, goToPage: noop }),
		)

		expect(result.current.regions.map((region) => region.id)).toEqual(['total', 'tax'])
	})

	it('fills the default colour, and keeps the one a region named', () => {
		const { result } = renderHook(() =>
			usePdfViewerHighlights({ highlights, activePage: letter, safePage: 1, goToPage: noop }),
		)

		expect(result.current.regions.map((region) => region.color)).toEqual(['amber', 'blue'])
	})

	it('divides an inch rect by the extent of the page it is given', () => {
		const { result } = renderHook(() =>
			usePdfViewerHighlights({
				// 0.85 in of 8.5 in wide, 2.2 in of 11 in tall — the first region's fractions.
				highlights: [
					{
						id: 'total',
						page: 1,
						rect: { x: 0.85, y: 2.2, width: 2.55, height: 0.55 },
						label: 'Total charges',
					},
				],
				highlightUnit: 'inch',
				activePage: letter,
				safePage: 1,
				goToPage: noop,
			}),
		)

		expect(result.current.regions[0]?.rect).toEqual({
			x: expect.closeTo(0.1, 10),
			y: expect.closeTo(0.2, 10),
			width: expect.closeTo(0.3, 10),
			height: expect.closeTo(0.05, 10),
		})
	})

	it('drops an inch rect on a page that carries no extent, and warns once', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(noop)

		const { result, rerender } = renderHook(() =>
			usePdfViewerHighlights({
				highlights,
				highlightUnit: 'inch',
				activePage: unmeasured,
				safePage: 1,
				goToPage: noop,
			}),
		)

		expect(result.current.regions).toEqual([])

		rerender()

		// Once for the hook's life, not once per render: the page it cannot measure is still
		// there on the next one, and a warning per frame is a warning nobody reads.
		expect(warn).toHaveBeenCalledOnce()

		expect(warn.mock.calls[0]?.[0]).toContain('highlightUnit="inch"')
	})

	it('turns to the page of the active region once, and not again while it stays active', () => {
		const goToPage = vi.fn()

		// Annotated, not inferred: `renderHook` takes its props type from `initialProps`, which
		// would fix it at `string` and reject the clearing render below.
		const initialProps: ActiveIdProps = { activeHighlightId: 'pro' }

		const { rerender } = renderHook(
			({ activeHighlightId }: ActiveIdProps) =>
				usePdfViewerHighlights({
					highlights,
					activeHighlightId,
					onActiveHighlightChange: noop,
					activePage: letter,
					safePage: 1,
					goToPage,
				}),
			{ initialProps },
		)

		// 'pro' sits on page 2 while page 1 is on screen: a list beside the viewer selects by
		// field, not by page.
		expect(goToPage).toHaveBeenCalledExactlyOnceWith(2)

		rerender({ activeHighlightId: 'pro' })

		// goToPage reports the page even when it does not change, so a consumer that re-passes
		// the same id every render would spam its own onPageChange.
		expect(goToPage).toHaveBeenCalledOnce()

		rerender({ activeHighlightId: null })

		rerender({ activeHighlightId: 'pro' })

		// Selecting it again is a fresh navigation, because the reader can have paged away.
		expect(goToPage).toHaveBeenCalledTimes(2)
	})

	it('reports a press to the handler of the latest render, through one stable function', () => {
		const first = vi.fn()
		const second = vi.fn()

		const { result, rerender } = renderHook(
			({ onHighlightPress }: { onHighlightPress: (id: string) => void }) =>
				usePdfViewerHighlights({
					highlights,
					onHighlightPress,
					activePage: letter,
					safePage: 1,
					goToPage: noop,
				}),
			{ initialProps: { onHighlightPress: first } },
		)

		const press = result.current.press

		rerender({ onHighlightPress: second })

		// The same function across the rerender: the layer takes this as a prop, and a new
		// identity each render would re-render every region on the page.
		expect(result.current.press).toBe(press)

		press('total')

		expect(first).not.toHaveBeenCalled()

		expect(second).toHaveBeenCalledExactlyOnceWith('total')
	})
})
