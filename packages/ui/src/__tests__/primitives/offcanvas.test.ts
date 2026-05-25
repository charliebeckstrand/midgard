import { renderHook } from '@testing-library/react'
import { createElement, use } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { OffcanvasContext } from '../../primitives/offcanvas'

describe('OffcanvasContext', () => {
	it('returns null outside provider', () => {
		const { result } = renderHook(() => use(OffcanvasContext))

		expect(result.current).toBeNull()
	})

	it('returns context value inside provider', () => {
		const close = vi.fn()

		const { result } = renderHook(() => use(OffcanvasContext), {
			wrapper: ({ children }) => createElement(OffcanvasContext, { value: { close } }, children),
		})

		expect(result.current).toEqual({ close })
	})
})
