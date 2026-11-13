// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NearbyDrawer, type NearbyDrawerProps } from '../../components/nearby-drawer'
import type { Place } from '../../types'
import { PANEL_START } from '../../utilities/places-url'
import { place } from '../fixtures'

afterEach(cleanup)

// jsdom has no `ResizeObserver`, and the panel measures itself with one. It
// has no layout either, and the trail measures the text of its crumbs.
beforeEach(() => {
	Range.prototype.getBoundingClientRect = () => new DOMRect()

	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	)
})

const a = place('a')

const b = place('b')

const c = place('c')

/** The props of a drawer over the list of the picked `items`. */
function props(picked: readonly string[], items: readonly Place[]): NearbyDrawerProps {
	return {
		picked,
		items,
		trail: ['United States of America', 'Oregon'],
		regionItems: items,
		step: PANEL_START,
		onStepChange: vi.fn(),
		onOpenChange: vi.fn(),
		onNavigate: vi.fn(),
		placeActions: {
			onAddVisit: vi.fn(),
			onEditVisit: vi.fn(),
			onEdit: vi.fn(),
			onDelete: vi.fn(),
			onDeleteVisit: vi.fn(),
		},
		tripActions: { onAddPlace: vi.fn(), onEditTrip: vi.fn(), onDeleteTrip: vi.fn() },
		tripLink: { trips: new Map(), href: () => '#', open: vi.fn() },
		placesByTrip: new Map(),
		onOpenPlace: vi.fn(),
	}
}

/** The order that the sort picker shows. */
const sort = () => screen.getByRole('combobox', { name: 'Sort' }).textContent

/** Picks `label` in the sort picker. */
async function sortBy(label: string) {
	await act(async () => {
		fireEvent.click(screen.getByRole('combobox', { name: 'Sort' }))
	})

	await act(async () => {
		// The popover sits outside the modal panel, which hides it, and its name,
		// from the accessibility tree of jsdom.
		const option = screen
			.getAllByRole('option', { hidden: true })
			.find((row) => row.textContent === label)

		if (option !== undefined) fireEvent.click(option)
	})
}

describe('NearbyDrawer', () => {
	it('shows one Close button, in the header', () => {
		render(h(NearbyDrawer, props(['a', 'b', 'c'], [a, b, c])))

		expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1)
	})

	it('returns the pickers to their start on a new pick', async () => {
		const { rerender } = render(h(NearbyDrawer, props(['a', 'b', 'c'], [a, b, c])))

		await sortBy('Rating')

		expect(sort()).toContain('Rating')

		rerender(h(NearbyDrawer, props(['a', 'b'], [a, b])))

		expect(sort()).toContain('Alphabetical')
	})

	// The pick stays, and the record goes from what the pick resolves to.
	it('keeps the pickers when a place of the pick is deleted', async () => {
		const { rerender } = render(h(NearbyDrawer, props(['a', 'b', 'c'], [a, b, c])))

		await sortBy('Rating')

		rerender(h(NearbyDrawer, props(['a', 'b', 'c'], [a, b])))

		expect(sort()).toContain('Rating')
	})
})
