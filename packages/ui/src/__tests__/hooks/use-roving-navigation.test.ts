import { describe, expect, it } from 'vitest'
import { nextIndexForKey, queryItems } from '../../hooks/use-roving'

describe('nextIndexForKey', () => {
	it('returns null for empty item count', () => {
		expect(nextIndexForKey('ArrowDown', 0, 0)).toBeNull()
	})

	it('Home returns 0', () => {
		expect(nextIndexForKey('Home', 3, 5)).toBe(0)
	})

	it('End returns last index', () => {
		expect(nextIndexForKey('End', 0, 5)).toBe(4)
	})

	it('vertical ArrowDown moves forward', () => {
		expect(nextIndexForKey('ArrowDown', 0, 5)).toBe(1)
	})

	it('vertical ArrowDown wraps from last to first', () => {
		expect(nextIndexForKey('ArrowDown', 4, 5)).toBe(0)
	})

	it('vertical ArrowUp moves backward', () => {
		expect(nextIndexForKey('ArrowUp', 2, 5)).toBe(1)
	})

	it('vertical ArrowUp wraps from first to last', () => {
		expect(nextIndexForKey('ArrowUp', 0, 5)).toBe(4)
	})

	it('horizontal ArrowRight moves forward', () => {
		expect(nextIndexForKey('ArrowRight', 1, 5, { orientation: 'horizontal' })).toBe(2)
	})

	it('horizontal ArrowLeft moves backward', () => {
		expect(nextIndexForKey('ArrowLeft', 2, 5, { orientation: 'horizontal' })).toBe(1)
	})

	it('returns null for unhandled key', () => {
		expect(nextIndexForKey('Escape', 0, 5)).toBeNull()
	})

	it('grid ArrowRight moves forward', () => {
		expect(nextIndexForKey('ArrowRight', 0, 6, { cols: 3 })).toBe(1)
	})

	it('grid ArrowLeft moves backward', () => {
		expect(nextIndexForKey('ArrowLeft', 1, 6, { cols: 3 })).toBe(0)
	})

	it('grid ArrowDown moves to next row', () => {
		expect(nextIndexForKey('ArrowDown', 1, 6, { cols: 3 })).toBe(4)
	})

	it('grid ArrowUp moves to previous row', () => {
		expect(nextIndexForKey('ArrowUp', 4, 6, { cols: 3 })).toBe(1)
	})

	it('-1 index with forward key returns 0', () => {
		expect(nextIndexForKey('ArrowDown', -1, 5)).toBe(0)
	})

	it('-1 index with backward key returns last', () => {
		expect(nextIndexForKey('ArrowUp', -1, 5)).toBe(4)
	})
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
