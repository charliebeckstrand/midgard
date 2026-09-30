import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePdfViewerPageRotation } from '../../components/pdf-viewer/use-pdf-viewer-page-rotation'

describe('usePdfViewerPageRotation', () => {
	// Each rotate() advances the active page by 90°. A turn to 360° is untransposed again.
	it.each([
		[0, 0, false],
		[1, 90, true],
		[3, 270, true],
		[4, 360, false],
	])('after %i rotate() calls reads %i° with isTransposed %s', (turns, rotation, transposed) => {
		const { result } = renderHook(() => usePdfViewerPageRotation(1))

		for (let turn = 0; turn < turns; turn++) act(() => result.current.rotate())

		expect(result.current.rotation).toBe(rotation)

		expect(result.current.isTransposed).toBe(transposed)
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
