import { act, renderHook } from '@testing-library/react'
import type { SyntheticEvent } from 'react'
import { describe, expect, it } from 'vitest'
import type { PdfViewerPage } from '../../components/pdf-viewer/types'
import { usePdfViewerPageSize } from '../../components/pdf-viewer/use-pdf-viewer-page-size'

function makeLoadEvent(
	naturalWidth: number,
	naturalHeight: number,
): SyntheticEvent<HTMLImageElement> {
	const img = document.createElement('img')

	Object.defineProperty(img, 'naturalWidth', { configurable: true, value: naturalWidth })

	Object.defineProperty(img, 'naturalHeight', { configurable: true, value: naturalHeight })

	const partial: Partial<SyntheticEvent<HTMLImageElement>> = { currentTarget: img }

	return partial as SyntheticEvent<HTMLImageElement>
}

describe('usePdfViewerPageSize', () => {
	it('returns null before any natural size is captured and no caller dimensions exist', () => {
		const { result } = renderHook(() => usePdfViewerPageSize({ src: '/p.png' } as PdfViewerPage, 1))

		expect(result.current.pageSize).toBeNull()
	})

	it('prefers caller-supplied width and height from the page model', () => {
		const { result } = renderHook(() =>
			usePdfViewerPageSize({ src: '/p.png', width: 200, height: 300 }, 1),
		)

		expect(result.current.pageSize).toEqual({ width: 200, height: 300 })
	})

	it('captures the natural size on image load when no caller dimensions exist', () => {
		const { result } = renderHook(() => usePdfViewerPageSize({ src: '/p.png' } as PdfViewerPage, 1))

		act(() => {
			result.current.onImageLoad(makeLoadEvent(150, 250))
		})

		expect(result.current.pageSize).toEqual({ width: 150, height: 250 })
	})

	it('resets the natural size when the active page changes', () => {
		const { result, rerender } = renderHook(
			({ page, safePage }: { page: PdfViewerPage; safePage: number }) =>
				usePdfViewerPageSize(page, safePage),
			{ initialProps: { page: { id: 1, src: '/a.png' }, safePage: 1 } },
		)

		act(() => {
			result.current.onImageLoad(makeLoadEvent(100, 200))
		})

		expect(result.current.pageSize).toEqual({ width: 100, height: 200 })

		rerender({ page: { id: 2, src: '/b.png' }, safePage: 2 })

		expect(result.current.pageSize).toBeNull()
	})
})
