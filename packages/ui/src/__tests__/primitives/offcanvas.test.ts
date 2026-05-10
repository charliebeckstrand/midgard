import { renderHook } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { OffcanvasProvider, useOffcanvasClose } from '../../primitives/offcanvas'

describe('useOffcanvasClose', () => {
	it('returns null outside provider', () => {
		const { result } = renderHook(() => useOffcanvasClose())

		expect(result.current).toBeNull()
	})

	it('returns context value inside provider', () => {
		const close = vi.fn()

		const { result } = renderHook(() => useOffcanvasClose(), {
			wrapper: ({ children }) => createElement(OffcanvasProvider, { value: { close } }, children),
		})

		expect(result.current).toEqual({ close })
	})
})
