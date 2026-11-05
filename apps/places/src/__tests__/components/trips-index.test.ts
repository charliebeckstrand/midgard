// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TripsIndex } from '../../components/trips-index'
import { place, trip } from '../fixtures'

afterEach(cleanup)

// jsdom has no layout, so each box measures 0 and the grid, which virtualizes
// its rows, renders none. Each box measures 800 × 600 here.
const sizes = ['offsetWidth', 'offsetHeight'] as const

const layout = sizes.map(
	(key) => [key, Object.getOwnPropertyDescriptor(HTMLElement.prototype, key)] as const,
)

beforeEach(() => {
	for (const key of sizes) {
		Object.defineProperty(HTMLElement.prototype, key, {
			configurable: true,
			get: () => (key === 'offsetWidth' ? 800 : 600),
		})
	}
})

afterEach(() => {
	for (const [key, descriptor] of layout) {
		if (descriptor !== undefined) Object.defineProperty(HTMLElement.prototype, key, descriptor)
	}
})

// jsdom has no `ResizeObserver`, and the panel and the grid measure themselves
// with one.
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

const lisbon = trip('lisbon', { name: 'Lisbon' })

describe('TripsIndex', () => {
	// A tap is a click and not a hover, so the places of a trip must open on a
	// click to reach a phone.
	it('names the places of a trip on a click of its button', async () => {
		render(
			h(TripsIndex, {
				open: true,
				onOpenChange: vi.fn(),
				trips: [lisbon],
				regionByTrip: new Map([['lisbon', 'Portugal']]),
				placesByTrip: new Map([['lisbon', [place('a', { name: 'Time Out Market' })]]]),
				onOpen: vi.fn(),
				actions: { onAddPlace: vi.fn(), onEditTrip: vi.fn(), onDeleteTrip: vi.fn() },
			}),
		)

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Places of Lisbon' }))
		})

		// The body of a tooltip loads on its first click, and then opens.
		expect(await screen.findByText('Time Out Market')).toBeTruthy()
	})
})
