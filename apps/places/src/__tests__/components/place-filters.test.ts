// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlaceFilters } from '../../components/place-filters'
import type { PlaceFilterValue } from '../../utilities/places-filter'

afterEach(cleanup)

// jsdom has no `ResizeObserver`, and the bar measures itself with one.
beforeEach(() => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	)
})

/** Whether the bar over `value` shows Clear. */
function showsClear(value: PlaceFilterValue, hasTrips: boolean): boolean {
	render(
		h(PlaceFilters, {
			value,
			onValueChange: vi.fn(),
			regionNames: ['Portugal'],
			regionLabel: 'All countries',
			drilled: null,
			onDrill: vi.fn(),
			hasTrips,
		}),
	)

	return screen.queryByRole('button', { name: 'Clear' }) !== null
}

describe('PlaceFilters', () => {
	it('shows Clear for a Show value while the Show field shows', () => {
		expect(showsClear({ show: ['places'] }, true)).toBe(true)
	})

	// The reader deleted the last trip, so the Show field went away. Its value
	// stays in the address, and a Clear for a field that is not there undoes
	// nothing that the reader can see.
	it('shows no Clear for a Show value while the Show field is hidden', () => {
		expect(showsClear({ show: ['places'] }, false)).toBe(false)
	})

	it('shows Clear for a category without trips', () => {
		expect(showsClear({ categories: ['food'] }, false)).toBe(true)
	})
})
