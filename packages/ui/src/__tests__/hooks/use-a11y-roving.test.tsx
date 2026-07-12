import { renderHook, waitFor } from '@testing-library/react'
import { type RefObject, useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	clearVirtualActive,
	clearVirtualActiveIndexed,
	queryItems,
	setVirtualActive,
	setVirtualActiveIndexed,
	useA11yRoving,
	type VirtualItemSource,
} from '../../hooks/a11y/use-a11y-roving'
import { makeKeyEvent } from '../helpers'

// Containers are appended to document.body for real focus/roving; RTL cleanup()
// only unmounts React roots, not these manual nodes. Track and remove them so a
// leftover option list can't contaminate a later test's DOM queries under the
// shuffled vmThreads worker.
const appendedContainers: HTMLElement[] = []

afterEach(() => {
	for (const el of appendedContainers) el.remove()

	appendedContainers.length = 0
})

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

describe('clearVirtualActive', () => {
	it('drops the owner aria-activedescendant (rows already unmounted)', () => {
		const owner = document.createElement('input')

		owner.setAttribute('aria-activedescendant', 'opt-1')

		clearVirtualActive({ current: owner })

		expect(owner.hasAttribute('aria-activedescendant')).toBe(false)
	})

	it('also strips the active row when items are supplied', () => {
		const active = document.createElement('div')

		active.setAttribute('role', 'option')

		active.id = 'opt-0'

		active.setAttribute('data-active', '')

		active.setAttribute('aria-selected', 'true')

		const owner = document.createElement('input')

		owner.setAttribute('aria-activedescendant', 'opt-0')

		clearVirtualActive({ current: owner }, [active])

		expect(active.hasAttribute('data-active')).toBe(false)

		expect(active.getAttribute('aria-selected')).toBe('false')

		expect(owner.hasAttribute('aria-activedescendant')).toBe(false)
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

	appendedContainers.push(container)

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

	appendedContainers.push(container)

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

	it('virtual mode: any key in an activationKey list clicks the active item', () => {
		const container = makeContainer(3)

		const items = Array.from(container.querySelectorAll('button'))

		items[1]?.setAttribute('data-active', '')

		const clickSpy = vi.fn()

		items[1]?.addEventListener('click', clickSpy)

		const { result } = renderHook(() => {
			const ref = useRef<HTMLElement>(container)

			return useA11yRoving(ref, {
				itemSelector: '[role="option"]',
				mode: 'virtual',
				activationKey: ['Enter', ' '],
			})
		})

		// Space (' ') is a listed activation key, so it activates like Enter.
		result.current(makeKeyEvent(' '))

		expect(clickSpy).toHaveBeenCalledTimes(1)

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

describe('useA11yRoving: manageTabIndex', () => {
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

describe('useA11yRoving: row actions', () => {
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

describe('useA11yRoving: itemSource (indexed navigation over a windowed list)', () => {
	// Simulates a virtualizer that has only `mountedIds` in the DOM out of a
	// much larger logical `count` — the scenario a10k-item VirtualOptions
	// window presents.
	function makeIndexedContainer(mountedIds: string[]) {
		const container = document.createElement('div')

		for (const id of mountedIds) {
			const row = document.createElement('div')

			row.id = id

			row.setAttribute('role', 'option')

			row.textContent = id

			container.appendChild(row)
		}

		document.body.appendChild(container)

		appendedContainers.push(container)

		return container
	}

	function mountRow(container: HTMLElement, id: string) {
		const row = document.createElement('div')

		row.id = id

		row.setAttribute('role', 'option')

		row.textContent = id

		container.appendChild(row)

		return row
	}

	function makeSource(
		count: number,
		overrides: Partial<VirtualItemSource> = {},
	): VirtualItemSource {
		return {
			count,
			getKey: (index) => `opt-${index}`,
			scrollToIndex: vi.fn(),
			...overrides,
		}
	}

	function setup(
		container: HTMLElement,
		source: VirtualItemSource,
		options: {
			activeIndex?: number
			activeDescendantRef?: RefObject<HTMLElement | null>
			typeahead?: boolean
		} = {},
	) {
		const activeIndexRef = { current: options.activeIndex ?? -1 }

		const { result } = renderHook(() => {
			const ref = useRef<HTMLElement>(container)

			const sourceRef = useRef(source)

			sourceRef.current = source

			return useA11yRoving(ref, {
				itemSelector: '[role="option"]',
				mode: 'virtual',
				itemSource: sourceRef,
				activeIndexRef,
				activeDescendantRef: options.activeDescendantRef,
				typeahead: options.typeahead,
			})
		})

		return { result, activeIndexRef }
	}

	it('ArrowDown past the rendered window: scrolls the target index and applies the highlight once it mounts', async () => {
		// Only opt-0..opt-2 are in the DOM (the rendered window); the source
		// reports 10,000 total items, opt-3 is windowed out.
		const container = makeIndexedContainer(['opt-0', 'opt-1', 'opt-2'])

		container.querySelector('#opt-2')?.setAttribute('data-active', '')

		const controller = document.createElement('input')

		document.body.appendChild(controller)

		const source = makeSource(10_000)

		const { result, activeIndexRef } = setup(container, source, {
			activeIndex: 2,
			activeDescendantRef: { current: controller },
		})

		result.current(makeKeyEvent('ArrowDown'))

		expect(source.scrollToIndex).toHaveBeenCalledWith(3, { align: 'auto' })

		expect(activeIndexRef.current).toBe(3)

		// aria-activedescendant points at the predicted id immediately, even
		// before the row mounts.
		expect(controller.getAttribute('aria-activedescendant')).toBe('opt-3')

		// The old active row is cleared immediately; the new one isn't mounted
		// yet, so nothing carries `data-active` for a moment.
		expect(container.querySelector('#opt-2')?.hasAttribute('data-active')).toBe(false)

		expect(container.querySelector('[data-active]')).toBeNull()

		// The virtualizer "renders" the target row once it scrolls into view.
		mountRow(container, 'opt-3')

		await waitFor(() => {
			expect(container.querySelector('#opt-3')?.hasAttribute('data-active')).toBe(true)
		})

		container.remove()

		controller.remove()
	})

	it('Home jumps straight to index 0 of a 10,000-item source without touching the DOM window', () => {
		const container = makeIndexedContainer(['opt-500', 'opt-501'])

		const source = makeSource(10_000)

		const { activeIndexRef, result } = setup(container, source, { activeIndex: 500 })

		result.current(makeKeyEvent('Home'))

		expect(source.scrollToIndex).toHaveBeenCalledWith(0, { align: 'auto' })

		expect(activeIndexRef.current).toBe(0)

		container.remove()
	})

	it('End jumps to the last index of a 10,000-item source', () => {
		const container = makeIndexedContainer(['opt-0'])

		const source = makeSource(10_000)

		const { activeIndexRef, result } = setup(container, source, { activeIndex: 0 })

		result.current(makeKeyEvent('End'))

		expect(source.scrollToIndex).toHaveBeenCalledWith(9_999, { align: 'auto' })

		expect(activeIndexRef.current).toBe(9_999)

		container.remove()
	})

	it('type-ahead matches an offscreen item by its data text value, not the DOM', () => {
		const container = makeIndexedContainer(['opt-0'])

		const labels = ['Apple', 'Banana', 'Cherry', 'Date', 'Cantaloupe']

		const source = makeSource(labels.length, {
			getTextValue: (index) => labels[index] as string,
		})

		const { activeIndexRef, result } = setup(container, source, {
			activeIndex: -1,
			typeahead: true,
		})

		result.current(makeKeyEvent('c'))

		// Matches "Cherry" (index 2), not "Cantaloupe" (index 4) — first match
		// from the start.
		expect(activeIndexRef.current).toBe(2)

		expect(source.scrollToIndex).toHaveBeenCalledWith(2, { align: 'auto' })

		container.remove()
	})

	it('type-ahead is a no-op (consumed, no move) when the source has no getTextValue', () => {
		const container = makeIndexedContainer(['opt-0'])

		const source = makeSource(100)

		const { activeIndexRef, result } = setup(container, source, {
			activeIndex: -1,
			typeahead: true,
		})

		const event = makeKeyEvent('a')

		result.current(event)

		expect(event.preventDefault).not.toHaveBeenCalled()

		expect(activeIndexRef.current).toBe(-1)

		container.remove()
	})

	it('skips disabled indices on ArrowDown, wrapping past them', () => {
		const container = makeIndexedContainer(['opt-0', 'opt-1', 'opt-2', 'opt-3'])

		const source = makeSource(4, { isDisabled: (index) => index === 1 || index === 2 })

		const { activeIndexRef, result } = setup(container, source, { activeIndex: 0 })

		result.current(makeKeyEvent('ArrowDown'))

		expect(activeIndexRef.current).toBe(3)

		expect(source.scrollToIndex).toHaveBeenCalledWith(3, { align: 'auto' })
	})

	it('Home skips a disabled first item and lands on the first enabled one', () => {
		const container = makeIndexedContainer(['opt-0', 'opt-1'])

		const source = makeSource(3, { isDisabled: (index) => index === 0 })

		const { activeIndexRef, result } = setup(container, source, { activeIndex: -1 })

		result.current(makeKeyEvent('Home'))

		expect(activeIndexRef.current).toBe(1)
	})

	it('does not move when every index is disabled', () => {
		const container = makeIndexedContainer(['opt-0'])

		const source = makeSource(3, { isDisabled: () => true })

		const { activeIndexRef, result } = setup(container, source, { activeIndex: -1 })

		const event = makeKeyEvent('ArrowDown')

		result.current(event)

		expect(event.preventDefault).not.toHaveBeenCalled()

		expect(activeIndexRef.current).toBe(-1)
	})

	it('Enter clicks the mounted active row', () => {
		const container = makeIndexedContainer(['opt-0', 'opt-1'])

		const clickSpy = vi.fn()

		container.querySelector('#opt-1')?.addEventListener('click', clickSpy)

		const source = makeSource(1_000)

		const { result } = setup(container, source, { activeIndex: 1 })

		result.current(makeKeyEvent('Enter'))

		expect(clickSpy).toHaveBeenCalled()

		container.remove()
	})

	it('Enter is a no-op when the active row jumped past the window and has not mounted yet', () => {
		const container = makeIndexedContainer(['opt-0'])

		const source = makeSource(1_000)

		const { result } = setup(container, source, { activeIndex: 500 })

		expect(() => result.current(makeKeyEvent('Enter'))).not.toThrow()

		container.remove()
	})

	it('clamps a stale activeIndexRef when the source shrinks (e.g. a filter narrows the list)', () => {
		const container = makeIndexedContainer(['opt-0', 'opt-1', 'opt-2', 'opt-3', 'opt-4'])

		const source = makeSource(5)

		// Stale index from before a filter shrank the source from 1,000 to 5.
		const { activeIndexRef, result } = setup(container, source, { activeIndex: 50 })

		result.current(makeKeyEvent('ArrowDown'))

		// Clamped to the last valid index (4), then wraps forward to 0.
		expect(activeIndexRef.current).toBe(0)

		expect(source.scrollToIndex).toHaveBeenCalledWith(0, { align: 'auto' })

		container.remove()
	})
})

describe('setVirtualActiveIndexed', () => {
	it('records the index, scrolls it into view, and applies the highlight when the row is mounted', () => {
		const container = document.createElement('div')

		const row = document.createElement('div')

		row.id = 'opt-2'

		row.setAttribute('role', 'option')

		container.appendChild(row)

		document.body.appendChild(container)

		const owner = document.createElement('input')

		document.body.appendChild(owner)

		const source: VirtualItemSource = {
			count: 5,
			getKey: (i) => `opt-${i}`,
			scrollToIndex: vi.fn(),
		}

		const activeIndexRef = { current: -1 }

		setVirtualActiveIndexed(container, source, 2, activeIndexRef, { current: owner })

		expect(activeIndexRef.current).toBe(2)

		expect(source.scrollToIndex).toHaveBeenCalledWith(2, { align: 'auto' })

		expect(row.hasAttribute('data-active')).toBe(true)

		expect(owner.getAttribute('aria-activedescendant')).toBe('opt-2')

		container.remove()

		owner.remove()
	})

	it('points aria-activedescendant at the predicted id even when the row is not mounted', () => {
		const container = document.createElement('div')

		document.body.appendChild(container)

		const owner = document.createElement('input')

		document.body.appendChild(owner)

		const source: VirtualItemSource = {
			count: 5,
			getKey: (i) => `opt-${i}`,
			scrollToIndex: vi.fn(),
		}

		const activeIndexRef = { current: -1 }

		setVirtualActiveIndexed(container, source, 4, activeIndexRef, { current: owner })

		expect(owner.getAttribute('aria-activedescendant')).toBe('opt-4')

		expect(container.querySelector('[data-active]')).toBeNull()

		container.remove()

		owner.remove()
	})
})

describe('clearVirtualActiveIndexed', () => {
	it('resets the active index and drops aria-activedescendant', () => {
		const container = document.createElement('div')

		const row = document.createElement('div')

		row.id = 'opt-0'

		row.setAttribute('data-active', '')

		container.appendChild(row)

		document.body.appendChild(container)

		const owner = document.createElement('input')

		owner.setAttribute('aria-activedescendant', 'opt-0')

		document.body.appendChild(owner)

		const activeIndexRef = { current: 0 }

		clearVirtualActiveIndexed(container, activeIndexRef, { current: owner })

		expect(activeIndexRef.current).toBe(-1)

		expect(owner.hasAttribute('aria-activedescendant')).toBe(false)

		expect(row.hasAttribute('data-active')).toBe(false)

		container.remove()

		owner.remove()
	})
})

describe('setVirtualActiveIndexed: mount-catch-up watcher', () => {
	// The watcher is scoped to the `container` and `index` a single call
	// resolves, not a persistent ref-driven effect — so it keeps working
	// however the container's DOM identity behaves across renders (a
	// `useEffect`-based observer keyed on the container ref can miss a target
	// that mounts without the owning component re-rendering, e.g. under a real
	// animation library rather than a mocked one).
	it('applies the highlight once the target row mounts after the initial call found nothing', async () => {
		const container = document.createElement('div')

		document.body.appendChild(container)

		appendedContainers.push(container)

		const owner = document.createElement('input')

		document.body.appendChild(owner)

		const source: VirtualItemSource = {
			count: 5,
			getKey: (i) => `watch-opt-${i}`,
			scrollToIndex: vi.fn(),
		}

		const activeIndexRef = { current: -1 }

		setVirtualActiveIndexed(container, source, 3, activeIndexRef, { current: owner })

		// Not mounted yet: the highlight only points aria-activedescendant.
		expect(container.querySelector('[data-active]')).toBeNull()

		const row = document.createElement('div')

		row.id = 'watch-opt-3'

		row.setAttribute('role', 'option')

		container.appendChild(row)

		await waitFor(() => expect(row.hasAttribute('data-active')).toBe(true))

		owner.remove()
	})

	it('a stale watcher declines to apply once a newer move supersedes it', async () => {
		const container = document.createElement('div')

		document.body.appendChild(container)

		appendedContainers.push(container)

		const source: VirtualItemSource = {
			count: 5,
			getKey: (i) => `stale-opt-${i}`,
			scrollToIndex: vi.fn(),
		}

		const activeIndexRef = { current: -1 }

		// First move to index 3 (not mounted yet, arms a watcher for it), then
		// immediately move to index 1 before it mounts.
		setVirtualActiveIndexed(container, source, 3, activeIndexRef)

		setVirtualActiveIndexed(container, source, 1, activeIndexRef)

		// The stale index-3 row now appears (e.g. a wide overscan window); its
		// watcher must not mark it active — activeIndexRef has moved on.
		const staleRow = document.createElement('div')

		staleRow.id = 'stale-opt-3'

		staleRow.setAttribute('role', 'option')

		container.appendChild(staleRow)

		const freshRow = document.createElement('div')

		freshRow.id = 'stale-opt-1'

		freshRow.setAttribute('role', 'option')

		container.appendChild(freshRow)

		await waitFor(() => expect(freshRow.hasAttribute('data-active')).toBe(true))

		expect(staleRow.hasAttribute('data-active')).toBe(false)
	})
})
