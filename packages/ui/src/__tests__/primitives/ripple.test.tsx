import { act, renderHook } from '@testing-library/react'
import type { PointerEvent } from 'react'
import { describe, expect, it } from 'vitest'
import { useRipple } from '../../primitives/ripple'
import { renderUI } from '../helpers'

function makePointerEvent(target: HTMLElement, clientX = 0, clientY = 0) {
	return {
		currentTarget: target,
		clientX,
		clientY,
	} as unknown as PointerEvent<HTMLElement>
}

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

	it('pushes a new ripple entry on pointer down', () => {
		const { result, rerender } = renderHook(() => useRipple())

		const host = document.createElement('div')

		host.getBoundingClientRect = () => ({ left: 10, top: 20, width: 100, height: 50 }) as DOMRect

		act(() => {
			result.current.onPointerDown(makePointerEvent(host, 30, 40))
		})

		rerender()

		const { container } = renderUI(result.current.element)

		// The motion.span entry is rendered as a child inside the aria-hidden wrapper.
		const entries = container.querySelectorAll('[aria-hidden] > span')

		expect(entries.length).toBeGreaterThanOrEqual(1)
	})

	it('sizes the ripple as double the larger side of the host rect', () => {
		const { result, rerender } = renderHook(() => useRipple())

		const host = document.createElement('div')

		host.getBoundingClientRect = () => ({ left: 0, top: 0, width: 40, height: 80 }) as DOMRect

		act(() => {
			result.current.onPointerDown(makePointerEvent(host, 10, 10))
		})

		rerender()

		const { container } = renderUI(result.current.element)

		const entry = container.querySelector('[aria-hidden] > span') as HTMLElement | null

		// 2 * max(40, 80) = 160
		expect(entry?.style.width).toBe('160px')

		expect(entry?.style.height).toBe('160px')
	})

	it('accepts a custom duration without error', () => {
		const { result } = renderHook(() => useRipple({ duration: 1 }))

		expect(result.current.element).toBeDefined()
	})
})
