import { renderHook } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { OffcanvasContext, useOffcanvas } from '../../primitives/offcanvas'

describe('useOffcanvas', () => {
	it('returns null outside provider', () => {
		const { result } = renderHook(() => useOffcanvas())

		expect(result.current).toBeNull()
	})

	it('returns context value inside provider', () => {
		const close = vi.fn()

		const { result } = renderHook(() => useOffcanvas(), {
			wrapper: ({ children }) =>
				createElement(OffcanvasContext.Provider, { value: { close } }, children),
		})

		expect(result.current).toEqual({ close })
	})
})
