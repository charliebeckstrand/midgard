import type { AddressSuggestion } from 'ui/address-input'
import { describe, expect, it } from 'vitest'
import {
	type StopRow,
	stopRow,
	type TripValues,
	toTripDraft,
	toTripStops,
	tripValidators,
	tripValues,
} from '../../components/place-form-drawer/trip-form'
import { fromDay } from '../../utilities/places-filter'
import { photo, trip } from '../fixtures'

const lisbon: AddressSuggestion = {
	id: 'R1:city',
	label: 'Lisbon',
	name: 'Lisbon',
	description: 'Lisbon, 1100-148, Portugal',
	address: { state: 'Lisbon', postcode: '1100-148', country: 'Portugal' },
	latitude: 38.72,
	longitude: -9.14,
}

const cafe: AddressSuggestion = {
	id: 'N2:cafe',
	label: 'Café A Brasileira',
	name: 'Café A Brasileira',
	address: { street: 'Rua Garrett 120', city: 'Lisbon', country: 'Portugal' },
	latitude: 38.71,
	longitude: -9.14,
}

/** Filled values of a new trip, from September 25 to 28. */
function filled(fields: Partial<TripValues> = {}): TripValues {
	return {
		...tripValues({ trip: null }),
		location: lisbon,
		name: 'Lisbon',
		days: [fromDay('2026-09-25'), fromDay('2026-09-28')],
		photos: [],
		...fields,
	}
}

/** A row on `day` that holds `match`. */
function row(match: AddressSuggestion | undefined, day: string, fields: Partial<StopRow> = {}) {
	return { ...stopRow(fromDay(day)), match, ...fields }
}

describe('tripValidators', () => {
	it('requires a location with a position', () => {
		expect(tripValidators.location?.(undefined, filled())).toBe('Location is required.')

		expect(tripValidators.location?.({ id: 'x', label: 'Nowhere' }, filled())).toBe(
			'That match has no position. Pick another.',
		)

		expect(tripValidators.location?.(lisbon, filled())).toBeUndefined()
	})

	it('requires the dates', () => {
		expect(tripValidators.days?.(undefined, filled())).toBe('Dates is required.')
	})

	it('takes a trip with no places, because its places can come later', () => {
		expect(tripValidators.stops?.([], filled())).toBeUndefined()
	})

	it('names the first row that is empty, unplaced, uncategorized, or off the days', () => {
		const values = filled()

		expect(tripValidators.stops?.([row(undefined, '2026-09-25')], values)).toBe(
			'Place 1 is empty. Search for it, or remove its row.',
		)

		expect(tripValidators.stops?.([row({ id: 'x', label: 'Nowhere' }, '2026-09-25')], values)).toBe(
			'Place 1 has no position. Pick another match.',
		)

		expect(tripValidators.stops?.([row(cafe, '2026-09-25')], values)).toBe(
			'Place 1 needs a category.',
		)

		expect(tripValidators.stops?.([row(cafe, '2026-09-29', { category: 'food' })], values)).toBe(
			'Place 1 is not on a day of the trip.',
		)
	})

	it('takes a place on record without a category', () => {
		expect(
			tripValidators.stops?.([row(cafe, '2026-09-26', { placeId: 'p1' })], filled()),
		).toBeUndefined()
	})
})

describe('toTripStops', () => {
	it('visits a place on record, and adds a new place with its one visit', () => {
		const stops = toTripStops([
			row(cafe, '2026-09-26', { placeId: 'p1' }),
			row(cafe, '2026-09-27', { category: 'food' }),
		])

		expect(stops[0]).toEqual({
			placeId: 'p1',
			visit: { visitedAt: '2026-09-26', rating: 0, photos: [] },
		})

		expect(stops[1]).toEqual({
			place: {
				name: 'Café A Brasileira',
				category: 'food',
				address: 'Rua Garrett 120, Lisbon, Portugal',
				city: 'Lisbon',
				state: undefined,
				country: 'Portugal',
				latitude: 38.71,
				longitude: -9.14,
				visits: [{ visitedAt: '2026-09-27', rating: 0, photos: [] }],
			},
		})
	})
})

describe('toTripDraft', () => {
	it('writes the days, the location, and the photo keys of the trip', () => {
		expect(toTripDraft(filled(), ['users/u1/a.jpg'], null)).toEqual({
			name: 'Lisbon',
			address: 'Lisbon, Portugal',
			city: undefined,
			state: 'Lisbon',
			country: 'Portugal',
			latitude: 38.72,
			longitude: -9.14,
			startsOn: '2026-09-25',
			endsOn: '2026-09-28',
			photos: ['users/u1/a.jpg'],
		})
	})

	it('keeps the parts on record while an edit keeps its own match', () => {
		const base = trip('t1', {
			city: 'Lisboa',
			country: 'Portugal',
			photos: [photo('users/u1/a.jpg')],
		})

		const values = tripValues({ trip: base })

		expect(values.photos).toEqual(base.photos)

		expect(toTripDraft(values, [], base)).toMatchObject({
			address: base.address,
			city: 'Lisboa',
			startsOn: base.startsOn,
			endsOn: base.endsOn,
		})
	})
})
