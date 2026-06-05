import { renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { setVirtualActive, useRoving } from '../../hooks/use-roving'
import { makeKeyEvent } from '../helpers'

describe('setVirtualActive', () => {
	function makeItems(count: number) {
		const items = Array.from({ length: count }, (_, i) => {
			const el = document.createElement('div')

			el.setAttribute('role', 'option')

			el.id = `opt-${i}`

			return el
		})

		const owner = document.createElement('input')

		return { items, owner }
	}

	it('moves data-active and mirrors aria-selected + aria-activedescendant', () => {
		const { items, owner } = makeItems(3)

		setVirtualActive(items, 0, { current: owner })

		expect(items[0]?.hasAttribute('data-active')).toBe(true)

		expect(items[0]?.getAttribute('aria-selected')).toBe('true')

		expect(owner.getAttribute('aria-activedescendant')).toBe('opt-0')

		setVirtualActive(items, 1, { current: owner })

		expect(items[0]?.hasAttribute('data-active')).toBe(false)

		expect(items[0]?.getAttribute('aria-selected')).toBe('false')

		expect(items[1]?.getAttribute('aria-selected')).toBe('true')

		expect(owner.getAttribute('aria-activedescendant')).toBe('opt-1')
	})

	it('clears the active state and aria-activedescendant on a negative index', () => {
		const { items, owner } = makeItems(3)

		setVirtualActive(items, 1, { current: owner })

		setVirtualActive(items, -1, { current: owner })

		expect(items.some((el) => el.hasAttribute('data-active'))).toBe(false)

		expect(items[1]?.getAttribute('aria-selected')).toBe('false')

		expect(owner.hasAttribute('aria-activedescendant')).toBe(false)
	})

	it('only toggles data-active when no owner ref is given', () => {
		const { items } = makeItems(3)

		setVirtualActive(items, 0)

		expect(items[0]?.hasAttribute('data-active')).toBe(true)

		expect(items[0]?.hasAttribute('aria-selected')).toBe(false)
	})
})

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

		const event = makeKeyEvent('ArrowDown')

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

		const event = makeKeyEvent('ArrowDown')

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

		const event = makeKeyEvent('ArrowDown')

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

		const event = makeKeyEvent('ArrowDown')

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

		const event = makeKeyEvent('ArrowDown')

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

		result.current(makeKeyEvent('ArrowDown'))

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

		result.current(makeKeyEvent('Enter'))

		expect(clickSpy).toHaveBeenCalled()

		container.remove()
	})

	it('virtual mode: mirrors the active item into aria-selected and aria-activedescendant', () => {
		const container = makeContainer(3)

		const items = Array.from(container.querySelectorAll('button'))

		items.forEach((el, i) => {
			el.id = `opt-${i}`
		})

		const controller = document.createElement('input')

		document.body.appendChild(controller)

		const { result } = renderHook(() => {
			const ref = useRef<HTMLElement>(container)

			const adRef = useRef<HTMLElement | null>(controller)

			return useRoving(ref, {
				itemSelector: '[role="option"]',
				mode: 'virtual',
				activeDescendantRef: adRef,
			})
		})

		result.current(makeKeyEvent('ArrowDown'))

		expect(items[0]?.getAttribute('aria-selected')).toBe('true')
		expect(controller.getAttribute('aria-activedescendant')).toBe('opt-0')

		result.current(makeKeyEvent('ArrowDown'))

		expect(items[0]?.getAttribute('aria-selected')).toBe('false')
		expect(items[1]?.getAttribute('aria-selected')).toBe('true')
		expect(controller.getAttribute('aria-activedescendant')).toBe('opt-1')

		container.remove()

		controller.remove()
	})

	it('virtual mode: leaves ARIA untouched when no activeDescendantRef is given', () => {
		const container = makeContainer(3)

		const items = Array.from(container.querySelectorAll('button'))

		const { result } = renderHook(() => {
			const ref = useRef<HTMLElement>(container)

			return useRoving(ref, { itemSelector: '[role="option"]', mode: 'virtual' })
		})

		result.current(makeKeyEvent('ArrowDown'))

		expect(items[0]?.hasAttribute('aria-selected')).toBe(false)

		container.remove()
	})

	it('virtual mode: activation key is a no-op when nothing is active', () => {
		const container = makeContainer(3)

		const { result } = renderHook(() => {
			const ref = useRef<HTMLElement>(container)

			return useRoving(ref, { itemSelector: '[role="option"]', mode: 'virtual' })
		})

		const event = makeKeyEvent('Enter')

		result.current(event)

		expect(event.preventDefault).not.toHaveBeenCalled()

		container.remove()
	})
})
