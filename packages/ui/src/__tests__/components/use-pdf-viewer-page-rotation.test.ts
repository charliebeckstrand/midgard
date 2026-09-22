import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePdfViewerPageRotation } from '../../components/pdf-viewer/use-pdf-viewer-page-rotation'

describe('usePdfViewerPageRotation', () => {
	it('starts unrotated', () => {
		const { result } = renderHook(() => usePdfViewerPageRotation(1))

		expect(result.current.rotation).toBe(0)

		expect(result.current.isTransposed).toBe(false)
	})

	it('rotate() advances the active page by 90°', () => {
		const { result } = renderHook(() => usePdfViewerPageRotation(1))

		act(() => result.current.rotate())

		expect(result.current.rotation).toBe(90)

		expect(result.current.isTransposed).toBe(true)
	})

	it('rotation past 360° is untransposed again', () => {
		const { result } = renderHook(() => usePdfViewerPageRotation(1))

		act(() => result.current.rotate())

		act(() => result.current.rotate())

		act(() => result.current.rotate())

		act(() => result.current.rotate())

		expect(result.current.rotation).toBe(360)

		expect(result.current.isTransposed).toBe(false)
	})

	it('isTransposed is true at 270° as well as 90°', () => {
		const { result } = renderHook(() => usePdfViewerPageRotation(1))

		act(() => result.current.rotate())

		act(() => result.current.rotate())

		act(() => result.current.rotate())

		expect(result.current.rotation).toBe(270)

		expect(result.current.isTransposed).toBe(true)
	})

	it('preserves rotation per page when the active page changes', () => {
		const { result, rerender } = renderHook(({ page }) => usePdfViewerPageRotation(page), {
			initialProps: { page: 1 },
		})

		act(() => result.current.rotate())

		expect(result.current.rotation).toBe(90)

		rerender({ page: 2 })

		expect(result.current.rotation).toBe(0)

		rerender({ page: 1 })

		expect(result.current.rotation).toBe(90)
	})
})
