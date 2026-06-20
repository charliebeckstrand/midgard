import { describe, expect, it } from 'vitest'
import { querySlot } from '../../core/query-slot'

// querySelector works on a detached subtree, so fixtures don't touch the
// document and need no cleanup.
function fixture(html: string): HTMLElement {
	const container = document.createElement('div')

	container.innerHTML = html

	return container
}

describe('querySlot', () => {
	it('returns null when the container is null', () => {
		expect(querySlot(null, 'row', 'id', '1')).toBeNull()
	})

	it('finds the element matching both slot and id', () => {
		const container = fixture(
			'<div data-slot="row" data-id="1">a</div><div data-slot="row" data-id="2">b</div>',
		)

		expect(querySlot(container, 'row', 'id', '2')?.textContent).toBe('b')
	})

	it('returns null when no element matches the id', () => {
		const container = fixture('<div data-slot="row" data-id="1">a</div>')

		expect(querySlot(container, 'row', 'id', '99')).toBeNull()
	})

	it('requires the slot to match, not just the id', () => {
		const container = fixture('<div data-slot="other" data-id="1">a</div>')

		expect(querySlot(container, 'row', 'id', '1')).toBeNull()
	})

	it('escapes ids containing CSS-special characters', () => {
		const container = fixture('<div data-slot="row" data-id="a.b:c">a</div>')

		expect(querySlot(container, 'row', 'id', 'a.b:c')?.textContent).toBe('a')
	})

	it('scopes the lookup to the given container', () => {
		const root = fixture(
			'<section data-region="a"><div data-slot="row" data-id="1">a</div></section><section data-region="b"><div data-slot="row" data-id="1">b</div></section>',
		)

		const sectionB = root.querySelector<HTMLElement>('[data-region="b"]')

		// id "1" exists in both sections; scoping to B must not match A's row.
		expect(querySlot(sectionB, 'row', 'id', '1')?.textContent).toBe('b')
	})
})
