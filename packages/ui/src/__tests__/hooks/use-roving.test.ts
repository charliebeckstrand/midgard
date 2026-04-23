import { renderHook } from '@testing-library/react'
import type { KeyboardEvent } from 'react'
import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useRoving } from '../../hooks/use-roving'

function makeContainer(count: number) {
	const container = document.createElement('div')

	for (let i = 0; i < count; i++) {
		const btn = document.createElement('button')

		btn.setAttribute('role', 'option')
		btn.setAttribute('tabindex', '-1')
		btn.textContent = String(i)

		container.appendChild(btn)
	}

	document.body.appendChild(container)

	return container
}

function makeKey(key: string) {
	return {
		key,
		preventDefault: vi.fn(),
	} as unknown as KeyboardEvent
}

describe('useRoving', () => {
	it('returns a function in focus mode', () => {
		const { result } = renderHook(() => {
			const ref = useRef<HTMLDivElement>(null)

			return useRoving(ref, { itemSelector: '[role="option"]' })
		})

		expect(typeof result.current).toBe('function')
	})

	it('returns a function in virtual mode', () => {
		const { result } = renderHook(() => {
			const ref = useRef<HTMLDivElement>(null)

			return useRoving(ref, { itemSelector: '[role="option"]', mode: 'virtual' })
		})

		expect(typeof result.current).toBe('function')
	})

	it('returned handler is referentially stable across renders', () => {
		const { result, rerender } = renderHook(() => {
			const ref = useRef<HTMLDivElement>(null)

			return useRoving(ref, { itemSelector: '[role="option"]' })
		})

		const first = result.current

		rerender()

		expect(result.current).toBe(first)
	})

	it('does nothing when the container has no items', () => {
		const empty = document.createElement('div')

		document.body.appendChild(empty)

		const { result } = renderHook(() => {
			const ref = useRef<HTMLElement>(empty)

			return useRoving(ref, { itemSelector: '[role="option"]' })
		})

		const event = makeKey('ArrowDown')

		expect(() => result.current(event)).not.toThrow()

		empty.remove()
	})

	it('focus mode: moves focus to the next item on ArrowDown', () => {
		const container = makeContainer(3)

		const items = container.querySelectorAll('button')
		const first = items[0] as HTMLButtonElement

		first.focus()

		const { result } = renderHook(() => {
			const ref = useRef<HTMLElement>(container)

			return useRoving(ref, { itemSelector: '[role="option"]' })
		})

		const event = makeKey('ArrowDown')

		result.current(event)

		expect(event.preventDefault).toHaveBeenCalled()

		expect(document.activeElement).toBe(items[1])

		container.remove()
	})

	it('focus mode: does nothing when no item is focused and focusOnEmpty is false', () => {
		const container = makeContainer(3)

		const { result } = renderHook(() => {
			const ref = useRef<HTMLElement>(container)

			return useRoving(ref, { itemSelector: '[role="option"]' })
		})

		const event = makeKey('ArrowDown')

		result.current(event)

		expect(event.preventDefault).not.toHaveBeenCalled()

		container.remove()
	})

	it('focus mode: focuses first item when focusOnEmpty is true and nothing is focused', () => {
		const container = makeContainer(3)

		const { result } = renderHook(() => {
			const ref = useRef<HTMLElement>(container)

			return useRoving(ref, { itemSelector: '[role="option"]', focusOnEmpty: true })
		})

		const event = makeKey('ArrowDown')

		result.current(event)

		expect(document.activeElement).toBe(container.querySelectorAll('button')[0])

		container.remove()
	})

	it('virtual mode: marks the first item active on ArrowDown when empty', () => {
		const container = makeContainer(3)

		const { result } = renderHook(() => {
			const ref = useRef<HTMLElement>(container)

			return useRoving(ref, { itemSelector: '[role="option"]', mode: 'virtual' })
		})

		const event = makeKey('ArrowDown')

		result.current(event)

		const items = container.querySelectorAll('button')

		expect(items[0]?.hasAttribute('data-active')).toBe(true)

		container.remove()
	})

	it('virtual mode: moves the active marker between items', () => {
		const container = makeContainer(3)

		const items = Array.from(container.querySelectorAll('button'))

		items[0]?.setAttribute('data-active', '')

		const { result } = renderHook(() => {
			const ref = useRef<HTMLElement>(container)

			return useRoving(ref, { itemSelector: '[role="option"]', mode: 'virtual' })
		})

		result.current(makeKey('ArrowDown'))

		expect(items[0]?.hasAttribute('data-active')).toBe(false)

		expect(items[1]?.hasAttribute('data-active')).toBe(true)

		container.remove()
	})

	it('virtual mode: activation key clicks the active item', () => {
		const container = makeContainer(3)

		const items = Array.from(container.querySelectorAll('button'))

		items[1]?.setAttribute('data-active', '')

		const clickSpy = vi.fn()

		items[1]?.addEventListener('click', clickSpy)

		const { result } = renderHook(() => {
			const ref = useRef<HTMLElement>(container)

			return useRoving(ref, { itemSelector: '[role="option"]', mode: 'virtual' })
		})

		result.current(makeKey('Enter'))

		expect(clickSpy).toHaveBeenCalled()

		container.remove()
	})

	it('virtual mode: activation key is a no-op when nothing is active', () => {
		const container = makeContainer(3)

		const { result } = renderHook(() => {
			const ref = useRef<HTMLElement>(container)

			return useRoving(ref, { itemSelector: '[role="option"]', mode: 'virtual' })
		})

		const event = makeKey('Enter')

		result.current(event)

		expect(event.preventDefault).not.toHaveBeenCalled()

		container.remove()
	})
})
