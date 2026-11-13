// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlaceDetails } from '../../components/place-summary'
import { place, trip } from '../fixtures'

afterEach(cleanup)

const lisbon = trip('t1', { name: 'Lisbon' })

/** The details of a place whose one visit was on the trip, and the open of the trip link. */
function renderDetails() {
	const open = vi.fn()

	render(
		h(PlaceDetails, {
			place: place('a', {
				visits: [{ id: 'v1', visitedAt: '2026-09-26', rating: 4, photos: [], tripId: 't1' }],
			}),
			actions: { onEditVisit: vi.fn(), onDeleteVisit: vi.fn() },
			tripLink: { trips: new Map([['t1', lisbon]]), href: () => '/?trip=t1', open },
		}),
	)

	return { open, link: screen.getByRole('link', { name: 'Lisbon' }) }
}

describe('PlaceDetails', () => {
	it('opens the trip of a visit in place on a click', () => {
		const { open, link } = renderDetails()

		expect(fireEvent.click(link)).toBe(false)

		expect(open).toHaveBeenCalledWith(lisbon)
	})

	it.for(['metaKey', 'ctrlKey', 'shiftKey'] as const)(
		'leaves a click with %s on the trip link to the browser',
		(modifier) => {
			const { open, link } = renderDetails()

			expect(fireEvent.click(link, { [modifier]: true })).toBe(true)

			expect(open).not.toHaveBeenCalled()
		},
	)
})
