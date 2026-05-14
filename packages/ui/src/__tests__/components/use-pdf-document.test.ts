import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePdfViewerDocument } from '../../components/pdf-viewer/use-pdf-viewer-document'

describe('usePdfViewerDocument', () => {
	it('returns an empty state when src is undefined', () => {
		const { result } = renderHook(() => usePdfViewerDocument(undefined))

		expect(result.current.pages).toEqual([])
		expect(result.current.documentUrl).toBeNull()
		expect(result.current.isLoading).toBe(false)
		expect(result.current.error).toBeNull()
	})

	it('resets to an empty state when src transitions back to undefined', () => {
		const { result, rerender } = renderHook(
			({ src }: { src?: string }) => usePdfViewerDocument(src),
			{
				initialProps: { src: undefined },
			},
		)

		rerender({ src: undefined })

		expect(result.current.pages).toEqual([])
		expect(result.current.documentUrl).toBeNull()
		expect(result.current.isLoading).toBe(false)
		expect(result.current.error).toBeNull()
	})
})
