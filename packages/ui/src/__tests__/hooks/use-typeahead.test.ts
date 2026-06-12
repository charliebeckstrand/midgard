import { describe, expect, it } from 'vitest'
import { matchTypeahead } from '../../hooks/a11y/use-typeahead'

describe('matchTypeahead', () => {
	function makeItems(labels: string[]) {
		return labels.map((label) => {
			const el = document.createElement('div')

			el.textContent = label

			return el
		})
	}

	it('matches the first item whose label starts with the typed character', () => {
		const items = makeItems(['Apple', 'Banana', 'Cherry'])

		expect(matchTypeahead({ query: '', timer: 0 }, items, 'b', -1)).toBe(1)
	})

	it('builds a prefix from distinct characters across calls', () => {
		const items = makeItems(['Cat', 'Car', 'Dog'])

		const state = { query: '', timer: 0 }

		expect(matchTypeahead(state, items, 'c', -1)).toBe(0)

		expect(matchTypeahead(state, items, 'a', 0)).toBe(0)

		expect(matchTypeahead(state, items, 'r', 0)).toBe(1)
	})

	it('cycles through items when the same character repeats', () => {
		const items = makeItems(['Ant', 'Bee', 'Ape', 'Bat'])

		const state = { query: '', timer: 0 }

		expect(matchTypeahead(state, items, 'a', -1)).toBe(0)

		expect(matchTypeahead(state, items, 'a', 0)).toBe(2)

		// Wraps back to the first "a" item past the end.
		expect(matchTypeahead(state, items, 'a', 2)).toBe(0)
	})

	it('reads aria-label in preference to text content', () => {
		const items = makeItems(['ignored'])

		items[0]?.setAttribute('aria-label', 'Zebra')

		expect(matchTypeahead({ query: '', timer: 0 }, items, 'z', -1)).toBe(0)

		expect(matchTypeahead({ query: '', timer: 0 }, items, 'i', -1)).toBeNull()
	})

	it('returns null when nothing matches', () => {
		const items = makeItems(['Apple', 'Banana'])

		expect(matchTypeahead({ query: '', timer: 0 }, items, 'z', -1)).toBeNull()
	})
})
