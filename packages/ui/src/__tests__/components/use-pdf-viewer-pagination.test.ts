import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePdfViewerPagination } from '../../components/pdf-viewer/use-pdf-viewer-pagination'

describe('usePdfViewerPagination', () => {
	it.each<[string, Parameters<typeof usePdfViewerPagination>[0], number]>([
		['starts at defaultPage when uncontrolled', { total: 10, defaultPage: 3 }, 3],
		['uses the controlled page when supplied', { total: 10, page: 5, defaultPage: 1 }, 5],
		['clamps safePage into [1, total]', { total: 10, page: 99, defaultPage: 1 }, 10],
		['returns 0 when total is 0', { total: 0, defaultPage: 1 }, 0],
	])('%s', (_name, options, expected) => {
		const { result } = renderHook(() => usePdfViewerPagination(options))

		expect(result.current.safePage).toBe(expected)
	})

	it.each([
		['rounds and clamps the incoming value', 3.7, 4],
		['clamps past the upper bound', 50, 10],
	])('goToPage %s', (_name, page, expected) => {
		const onPageChange = vi.fn()

		const { result } = renderHook(() =>
			usePdfViewerPagination({ total: 10, defaultPage: 1, onPageChange }),
		)

		act(() => {
			result.current.goToPage(page)
		})

		expect(onPageChange).toHaveBeenCalledWith(expected)
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
