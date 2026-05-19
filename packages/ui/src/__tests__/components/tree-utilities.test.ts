import { afterEach, describe, expect, it } from 'vitest'
import { ITEM_SELECTOR } from '../../components/tree/tree-constants'
import { ensureFirstItemActive, setActiveItem } from '../../components/tree/tree-utilities'

function makeTree(count: number): { container: HTMLDivElement; items: HTMLElement[] } {
	const container = document.createElement('div')

	for (let i = 0; i < count; i++) {
		const item = document.createElement('div')

		item.setAttribute('role', 'treeitem')
		container.appendChild(item)
	}

	document.body.appendChild(container)

	return { container, items: Array.from(container.querySelectorAll<HTMLElement>(ITEM_SELECTOR)) }
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('setActiveItem', () => {
	it('makes the target item tabbable and detunes every other item', () => {
		const { container, items } = makeTree(3)

		setActiveItem(container, items[1]!)

		expect(items[0]?.tabIndex).toBe(-1)

		expect(items[1]?.tabIndex).toBe(0)

		expect(items[2]?.tabIndex).toBe(-1)
	})
})

describe('ensureFirstItemActive', () => {
	it('seeds the first item as tabbable when none currently is', () => {
		const { container, items } = makeTree(3)

		ensureFirstItemActive(container)

		expect(items[0]?.tabIndex).toBe(0)

		expect(items[1]?.tabIndex).toBe(-1)

		expect(items[2]?.tabIndex).toBe(-1)
	})

	it('is a no-op when an item is already tabbable', () => {
		const { container, items } = makeTree(3)

		setActiveItem(container, items[2]!)

		ensureFirstItemActive(container)

		expect(items[0]?.tabIndex).toBe(-1)

		expect(items[2]?.tabIndex).toBe(0)
	})

	it('is a no-op when the container has no items', () => {
		const empty = document.createElement('div')

		document.body.appendChild(empty)

		expect(() => ensureFirstItemActive(empty)).not.toThrow()
	})
})
