import { renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { queryItems, setVirtualActive, useA11yRoving } from '../../hooks/a11y/use-a11y-roving'
import { makeKeyEvent } from '../helpers'

describe('queryItems', () => {
	it('returns empty array for null container', () => {
		expect(queryItems(null, 'button')).toEqual([])
	})

	it('returns matching elements', () => {
		const container = document.createElement('div')

		container.innerHTML = '<button>A</button><button>B</button><span>C</span>'

		const items = queryItems(container, 'button')

		expect(items).toHaveLength(2)
	})
})

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

function makeLabeledContainer(labels: string[]) {
	const container = document.createElement('div')

	for (const label of labels) {
		const btn = document.createElement('button')

		btn.setAttribute('role', 'option')

		btn.setAttribute('tabindex', '-1')

		btn.textContent = label

		container.appendChild(btn)
	}

	document.body.appendChild(container)

	return container
}

describe('useA11yRoving', () => {
	it('returns a function in focus mode', () => {
		const { result } = renderHook(() => {
			const ref = useRef<HTMLDivElement>(null)

			return useA11yRoving(ref, { itemSelector: '[role="option"]' })
		})

		expect(typeof result.current).toBe('function')
	})

	it('returns a function in virtual mode', () => {
		const { result } = renderHook(() => {
			const ref = useRef<HTMLDivElement>(null)

			return useA11yRoving(ref, { itemSelector: '[role="option"]', mode: 'virtual' })
		})

		expect(typeof result.current).toBe('function')
	})

	it('returned handler is referentially stable across renders', () => {
		const { result, rerender } = renderHook(() => {
			const ref = useRef<HTMLDivElement>(null)

			return useA11yRoving(ref, { itemSelector: '[role="option"]' })
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

			return useA11yRoving(ref, { itemSelector: '[role="option"]' })
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

			return useA11yRoving(ref, { itemSelector: '[role="option"]' })
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

			return useA11yRoving(ref, { itemSelector: '[role="option"]' })
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

			return useA11yRoving(ref, { itemSelector: '[role="option"]', focusOnEmpty: true })
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

			return useA11yRoving(ref, { itemSelector: '[role="option"]', mode: 'virtual' })
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

			return useA11yRoving(ref, { itemSelector: '[role="option"]', mode: 'virtual' })
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

			return useA11yRoving(ref, { itemSelector: '[role="option"]', mode: 'virtual' })
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

			return useA11yRoving(ref, {
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

			return useA11yRoving(ref, { itemSelector: '[role="option"]', mode: 'virtual' })
		})

		result.current(makeKeyEvent('ArrowDown'))

		expect(items[0]?.hasAttribute('aria-selected')).toBe(false)

		container.remove()
	})

	it('virtual mode: activation key is a no-op when nothing is active', () => {
		const container = makeContainer(3)

		const { result } = renderHook(() => {
			const ref = useRef<HTMLElement>(container)

			return useA11yRoving(ref, { itemSelector: '[role="option"]', mode: 'virtual' })
		})

		const event = makeKeyEvent('Enter')

		result.current(event)

		expect(event.preventDefault).not.toHaveBeenCalled()

		container.remove()
	})

	it('type-ahead: a letter focuses the matching item when enabled', () => {
		const container = makeLabeledContainer(['Apple', 'Banana', 'Cherry'])

		const items = container.querySelectorAll('button')

		const { result } = renderHook(() => {
			const ref = useRef<HTMLElement>(container)

			return useA11yRoving(ref, { itemSelector: '[role="option"]', typeahead: true })
		})

		const event = makeKeyEvent('c')

		result.current(event)

		expect(event.preventDefault).toHaveBeenCalled()

		expect(document.activeElement).toBe(items[2])

		container.remove()
	})

	it('type-ahead: printable keys are ignored when disabled', () => {
		const container = makeLabeledContainer(['Apple', 'Banana'])

		const { result } = renderHook(() => {
			const ref = useRef<HTMLElement>(container)

			return useA11yRoving(ref, { itemSelector: '[role="option"]' })
		})

		const event = makeKeyEvent('b')

		result.current(event)

		expect(event.preventDefault).not.toHaveBeenCalled()

		container.remove()
	})

	it('type-ahead: a non-matching letter is consumed without moving focus', () => {
		const container = makeLabeledContainer(['Apple', 'Banana'])

		const { result } = renderHook(() => {
			const ref = useRef<HTMLElement>(container)

			return useA11yRoving(ref, { itemSelector: '[role="option"]', typeahead: true })
		})

		const event = makeKeyEvent('z')

		result.current(event)

		expect(event.preventDefault).not.toHaveBeenCalled()

		container.remove()
	})
})

describe('useA11yRoving — manageTabIndex', () => {
	// Native <button>s start tabbable (tabIndex 0); the hook collapses them to
	// a single resting stop.
	function makeButtons(count: number, currentIndex?: number) {
		const container = document.createElement('div')

		for (let i = 0; i < count; i++) {
			const btn = document.createElement('button')

			btn.setAttribute('data-slot', 'item')

			if (i === currentIndex) btn.setAttribute('aria-current', 'page')

			btn.textContent = String(i)

			container.appendChild(btn)
		}

		document.body.appendChild(container)

		return container
	}

	const tabIndices = (container: HTMLElement) =>
		Array.from(container.querySelectorAll('button')).map((b) => b.tabIndex)

	it.each<[string, number | undefined, Parameters<typeof useA11yRoving>[1], number[]]>([
		[
			'collapses a row of tabbable items to a single resting stop on the first item',
			undefined,
			{ itemSelector: '[data-slot="item"]', manageTabIndex: true },
			[0, -1, -1],
		],
		[
			'seats the resting stop on the activeSelector match',
			2,
			{
				itemSelector: '[data-slot="item"]',
				manageTabIndex: true,
				activeSelector: '[aria-current="page"]',
			},
			[-1, -1, 0],
		],
		[
			'leaves tabindex untouched when manageTabIndex is off (default)',
			undefined,
			{ itemSelector: '[data-slot="item"]' },
			[0, 0, 0],
		],
	])('%s', (_name, current, options, expected) => {
		const container = makeButtons(3, current)

		renderHook(() => {
			const ref = useRef<HTMLElement>(container)

			return useA11yRoving(ref, options)
		})

		expect(tabIndices(container)).toEqual(expected)

		container.remove()
	})

	it('carries the resting stop to the focused item on arrow', () => {
		const container = makeButtons(3)

		const { result } = renderHook(() => {
			const ref = useRef<HTMLElement>(container)

			return useA11yRoving(ref, { itemSelector: '[data-slot="item"]', manageTabIndex: true })
		})

		const items = Array.from(container.querySelectorAll('button'))

		items[0]?.focus()

		result.current(makeKeyEvent('ArrowDown'))

		expect(document.activeElement).toBe(items[1])

		expect(tabIndices(container)).toEqual([-1, 0, -1])

		container.remove()
	})

	it('carries the resting stop to a focused item without an arrow key (click / programmatic)', () => {
		const container = makeButtons(3)

		renderHook(() => {
			const ref = useRef<HTMLElement>(container)

			return useA11yRoving(ref, { itemSelector: '[data-slot="item"]', manageTabIndex: true })
		})

		const items = Array.from(container.querySelectorAll('button'))

		expect(tabIndices(container)).toEqual([0, -1, -1])

		// Focus landing on a control by any route (a click, programmatic focus)
		// makes it the resting stop.
		items[2]?.focus()

		expect(tabIndices(container)).toEqual([-1, -1, 0])

		container.remove()
	})
})

describe('useA11yRoving — row actions', () => {
	const ROW = {
		rowSelector: '[data-slot="row"]',
		actionSelector: '[data-slot="action"]:not(:disabled)',
	}

	function makeControl(slot: string, label: string, disabled = false) {
		const btn = document.createElement('button')

		btn.setAttribute('data-slot', slot)

		btn.textContent = label

		btn.disabled = disabled

		return btn
	}

	// Each row wraps an item with optional prefix/suffix action controls.
	function makeRows(rows: Array<{ prefix?: boolean; suffix?: boolean; suffixDisabled?: boolean }>) {
		const container = document.createElement('div')

		rows.forEach((spec, i) => {
			const rowEl = document.createElement('div')

			rowEl.setAttribute('data-slot', 'row')

			if (spec.prefix) rowEl.appendChild(makeControl('action', `prefix-${i}`))

			rowEl.appendChild(makeControl('item', `item-${i}`))

			if (spec.suffix) rowEl.appendChild(makeControl('action', `suffix-${i}`, spec.suffixDisabled))

			container.appendChild(rowEl)
		})

		document.body.appendChild(container)

		return container
	}

	function setup(container: HTMLElement, manageTabIndex = false) {
		const { result } = renderHook(() => {
			const ref = useRef<HTMLElement>(container)

			return useA11yRoving(ref, { itemSelector: '[data-slot="item"]', row: ROW, manageTabIndex })
		})

		return result
	}

	const byText = (container: HTMLElement, label: string) =>
		Array.from(container.querySelectorAll('button')).find((b) => b.textContent === label)

	it('roves from the item into its suffix action on the cross-axis forward arrow', () => {
		const container = makeRows([{ suffix: true }, { suffix: true }])

		const result = setup(container)

		byText(container, 'item-0')?.focus()

		const event = makeKeyEvent('ArrowRight')

		result.current(event)

		expect(event.preventDefault).toHaveBeenCalled()

		expect(document.activeElement).toBe(byText(container, 'suffix-0'))

		container.remove()
	})

	it.each<[string, Parameters<typeof makeRows>[0], string, string, string]>([
		[
			'roves from the item into its prefix action on the cross-axis back arrow',
			[{ prefix: true, suffix: true }],
			'item-0',
			'ArrowLeft',
			'prefix-0',
		],
		[
			'clamps at the row edges instead of wrapping',
			[{ suffix: true }],
			'suffix-0',
			'ArrowRight',
			'suffix-0',
		],
		[
			// The only action is disabled, so the item is the row edge.
			'skips disabled actions',
			[{ suffix: true, suffixDisabled: true }],
			'item-0',
			'ArrowRight',
			'item-0',
		],
	])('%s', (_name, rows, focusLabel, key, expectedActive) => {
		const container = makeRows(rows)

		const result = setup(container)

		byText(container, focusLabel)?.focus()

		result.current(makeKeyEvent(key))

		expect(document.activeElement).toBe(byText(container, expectedActive))

		container.remove()
	})

	it('anchors main-axis arrows from an action to the row, landing on the adjacent item', () => {
		const container = makeRows([{ suffix: true }, { suffix: true }])

		const result = setup(container)

		byText(container, 'suffix-0')?.focus()

		const event = makeKeyEvent('ArrowDown')

		result.current(event)

		expect(event.preventDefault).toHaveBeenCalled()

		expect(document.activeElement).toBe(byText(container, 'item-1'))

		container.remove()
	})

	it('leaves cross-axis keys alone when nothing in a row has focus', () => {
		const container = makeRows([{ suffix: true }])

		const result = setup(container)

		const event = makeKeyEvent('ArrowRight')

		result.current(event)

		expect(event.preventDefault).not.toHaveBeenCalled()

		container.remove()
	})

	it('manageTabIndex: pins actions at tabIndex -1 and rests the stop on the item', () => {
		const container = makeRows([{ prefix: true, suffix: true }])

		setup(container, true)

		expect(byText(container, 'prefix-0')?.tabIndex).toBe(-1)

		expect(byText(container, 'suffix-0')?.tabIndex).toBe(-1)

		expect(byText(container, 'item-0')?.tabIndex).toBe(0)

		// Focus landing on an action keeps the resting stop on the row's item.
		byText(container, 'suffix-0')?.focus()

		expect(byText(container, 'item-0')?.tabIndex).toBe(0)

		expect(byText(container, 'suffix-0')?.tabIndex).toBe(-1)

		container.remove()
	})
})
