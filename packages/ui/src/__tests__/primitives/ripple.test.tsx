import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useRipple } from '../../primitives/ripple'
import { renderUI } from '../helpers'

describe('useRipple', () => {
	it('returns onPointerDown handler and element', () => {
		const { result } = renderHook(() => useRipple())

		expect(typeof result.current.onPointerDown).toBe('function')

		expect(result.current.element).toBeDefined()
	})

	it('renders an aria-hidden container element', () => {
		const { result } = renderHook(() => useRipple())

		const { container } = renderUI(result.current.element)

		const span = container.querySelector('[aria-hidden]')

		expect(span).toBeInTheDocument()
	})
})
