import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePdfViewerPagination } from '../../components/pdf-viewer/use-pdf-viewer-pagination'

describe('usePdfViewerPagination', () => {
	it('starts at defaultPage when uncontrolled', () => {
		const { result } = renderHook(() => usePdfViewerPagination({ total: 10, defaultPage: 3 }))

		expect(result.current.safePage).toBe(3)
	})

	it('uses the controlled page when supplied', () => {
		const { result } = renderHook(() =>
			usePdfViewerPagination({ total: 10, page: 5, defaultPage: 1 }),
		)

		expect(result.current.safePage).toBe(5)
	})

	it('clamps safePage into [1, total]', () => {
		const { result } = renderHook(() =>
			usePdfViewerPagination({ total: 10, page: 99, defaultPage: 1 }),
		)

		expect(result.current.safePage).toBe(10)
	})

	it('returns 0 when total is 0', () => {
		const { result } = renderHook(() => usePdfViewerPagination({ total: 0, defaultPage: 1 }))

		expect(result.current.safePage).toBe(0)
	})

	it('goToPage rounds and clamps the incoming value', () => {
		const onPageChange = vi.fn()

		const { result } = renderHook(() =>
			usePdfViewerPagination({ total: 10, defaultPage: 1, onPageChange }),
		)

		act(() => {
			result.current.goToPage(3.7)
		})

		expect(onPageChange).toHaveBeenCalledWith(4)
	})

	it('goToPage clamps past the upper bound', () => {
		const onPageChange = vi.fn()

		const { result } = renderHook(() =>
			usePdfViewerPagination({ total: 10, defaultPage: 1, onPageChange }),
		)

		act(() => {
			result.current.goToPage(50)
		})

		expect(onPageChange).toHaveBeenCalledWith(10)
	})

	it('goToPage is a no-op when total is 0', () => {
		const onPageChange = vi.fn()

		const { result } = renderHook(() =>
			usePdfViewerPagination({ total: 0, defaultPage: 1, onPageChange }),
		)

		act(() => {
			result.current.goToPage(3)
		})

		expect(onPageChange).not.toHaveBeenCalled()
	})
})
