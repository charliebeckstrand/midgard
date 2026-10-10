import type { AddressProvider, AddressSuggestion } from 'ui/address-input'
import { describe, expect, it, vi } from 'vitest'
import { locatePlace } from '../../components/place-form-drawer/location-form'
import {
	type PlaceValues,
	placeValidators,
	targetValues,
	toPlaceDraft,
	toVisitDraft,
	toVisitPlaceDraft,
} from '../../components/place-form-drawer/place-form'
import { photo, place, trip, visitWith } from '../fixtures'

/** Filled values with no match, which is a place that the reader typed the address of. */
function typed(fields: Partial<PlaceValues> = {}): PlaceValues {
	return {
		place: undefined,
		name: "Stella's Ice Cream",
		address: '16020 SW Tualatin-Sherwood Rd, Sherwood, OR',
		locateBy: 'address',
		latitude: '',
		longitude: '',
		category: 'food',
		url: '',
		visitedAt: new Date(2026, 8, 27),
		rating: 5,
		photos: [],
		review: '',
		...fields,
	}
}

const sherwood: AddressSuggestion = {
	id: 'W1:house',
	label: '16020 SW Tualatin-Sherwood Rd',
	address: { street: '16020 SW Tualatin-Sherwood Rd', city: 'Sherwood', state: 'Oregon' },
	latitude: 45.36,
	longitude: -122.84,
}

const signal = new AbortController().signal

describe('placeValidators', () => {
	const validators = placeValidators([trip('t1', { startsOn: '2026-09-25', endsOn: '2026-09-28' })])

	it('takes a place with no match, because the address locates it', () => {
		expect(validators.place?.(undefined, typed())).toBeUndefined()
	})

	it('refuses a match with no position', () => {
		expect(validators.place?.({ id: 'a', label: 'A' }, typed())).toBe(
			'That match has no position. Pick another.',
		)
	})

	it('requires the address', () => {
		expect(validators.address?.('  ', typed())).toBe('Address is required.')
	})

	it('requires the coordinates and not the address where the coordinates give the position', () => {
		const values = typed({ locateBy: 'coordinates', address: '' })

		expect(validators.address?.('', values)).toBeUndefined()

		expect(validators.latitude?.(' ', values)).toBe('Latitude is required.')

		expect(validators.longitude?.('', values)).toBe('Longitude is required.')
	})

	it('refuses a coordinate that is not a number or is out of range', () => {
		const values = typed({ locateBy: 'coordinates' })

		expect(validators.latitude?.('0x10', values)).toBe('Latitude is not a number.')

		expect(validators.latitude?.('-90.5', values)).toBe('Latitude is not between -90 and 90.')

		expect(validators.longitude?.('-122.84', values)).toBeUndefined()

		expect(validators.longitude?.('181', values)).toBe('Longitude is not between -180 and 180.')
	})

	it('does not check the coordinates where the address gives the position', () => {
		expect(validators.latitude?.('', typed())).toBeUndefined()
	})

	it('takes a visit on a day of its trip, and refuses one outside', () => {
		expect(validators.visitedAt?.(new Date(2026, 8, 27), typed({ tripId: 't1' }))).toBeUndefined()

		expect(validators.visitedAt?.(new Date(2026, 8, 29), typed({ tripId: 't1' }))).toBe(
			'Visited is not a day of the trip.',
		)

		expect(validators.visitedAt?.(new Date(2026, 8, 29), typed())).toBeUndefined()
	})
})

describe('targetValues', () => {
	it('starts a new place from a trip on the trip and its first day', () => {
		const values = targetValues({
			kind: 'place',
			place: null,
			trip: trip('t1', { startsOn: '2026-09-25' }),
		})

		expect(values.tripId).toBe('t1')

		expect(values.visitedAt).toEqual(new Date(2026, 8, 25))
	})

	it('reads the trip of a stored visit', () => {
		const base = place('p1', {
			visits: [{ id: 'v1', visitedAt: '2026-09-26', rating: 0, photos: [], tripId: 't1' }],
		})

		expect(targetValues({ kind: 'visit', place: base, visit: base.visits[0] ?? null }).tripId).toBe(
			't1',
		)
	})
})

describe('toVisitDraft', () => {
	it('writes the trip of the visit', () => {
		expect(toVisitDraft(typed({ tripId: 't1' }), []).tripId).toBe('t1')

		expect(toVisitDraft(typed(), []).tripId).toBeUndefined()
	})
})

describe('locatePlace', () => {
	it('keeps the match from the search and does not geocode', async () => {
		const geocode = vi.fn<AddressProvider>()

		await expect(locatePlace(typed({ place: sherwood }), geocode, signal)).resolves.toBe(sherwood)

		expect(geocode).not.toHaveBeenCalled()
	})

	it('geocodes a typed address and takes the first match with a position', async () => {
		const geocode = vi.fn<AddressProvider>().mockResolvedValue([{ id: 'x', label: 'X' }, sherwood])

		await expect(
			locatePlace(typed({ address: '  16020 SW Tualatin  ' }), geocode, signal),
		).resolves.toBe(sherwood)

		expect(geocode).toHaveBeenCalledWith('16020 SW Tualatin', { signal })
	})

	it('answers null when no match has a position', async () => {
		const geocode = vi.fn<AddressProvider>().mockResolvedValue([{ id: 'x', label: 'X' }])

		await expect(locatePlace(typed(), geocode, signal)).resolves.toBeNull()
	})

	it('searches the address without its unit when the typed address finds nothing', async () => {
		const geocode = vi
			.fn<AddressProvider>()
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([sherwood])

		const address = '16784 SW Edy Rd Unit 103, Sherwood, OR 97140'

		await expect(locatePlace(typed({ address }), geocode, signal)).resolves.toBe(sherwood)

		expect(geocode.mock.calls.map(([query]) => query)).toEqual([
			address,
			'16784 SW Edy Rd, Sherwood, OR 97140',
		])
	})

	it('prefers a house from a later query to a street from an earlier one', async () => {
		const street: AddressSuggestion = {
			id: 'W2:street',
			label: 'SW Edy Rd',
			name: 'SW Edy Rd',
			latitude: 45.35,
			longitude: -122.85,
		}

		const geocode = vi
			.fn<AddressProvider>()
			.mockResolvedValueOnce([street])
			.mockResolvedValueOnce([street, sherwood])

		await expect(
			locatePlace(typed({ address: '16784 SW Edy Rd Unit 103, Sherwood' }), geocode, signal),
		).resolves.toBe(sherwood)
	})

	it('takes the first match with a position where no query finds a house', async () => {
		const street: AddressSuggestion = { id: 'W2:street', label: 'Edy', latitude: 1, longitude: 2 }

		const geocode = vi.fn<AddressProvider>().mockResolvedValue([street])

		await expect(
			locatePlace(typed({ address: '16784 SW Edy Rd Unit 103' }), geocode, signal),
		).resolves.toBe(street)

		expect(geocode).toHaveBeenCalledTimes(2)
	})

	it('takes the typed coordinates and does not geocode', async () => {
		const geocode = vi.fn<AddressProvider>()

		const located = await locatePlace(
			typed({ locateBy: 'coordinates', latitude: ' 45.3584 ', longitude: '-122.8406' }),
			geocode,
			signal,
		)

		expect(located).toMatchObject({ latitude: 45.3584, longitude: -122.8406 })

		expect(geocode).not.toHaveBeenCalled()
	})

	it('keeps the match where the coordinates are its position', async () => {
		const values = typed({
			locateBy: 'coordinates',
			place: sherwood,
			latitude: '45.36',
			longitude: '-122.84',
		})

		await expect(locatePlace(values, vi.fn<AddressProvider>(), signal)).resolves.toBe(sherwood)
	})
})

describe('toPlaceDraft', () => {
	it('stores the typed address line and the position and parts of the match', () => {
		const draft = toPlaceDraft(typed(), sherwood, [])

		expect(draft).toMatchObject({
			address: '16020 SW Tualatin-Sherwood Rd, Sherwood, OR',
			city: 'Sherwood',
			state: 'Oregon',
			latitude: 45.36,
			longitude: -122.84,
		})
	})

	it('stores the coordinates as the address line where there is no address', async () => {
		const values = typed({
			locateBy: 'coordinates',
			address: ' ',
			latitude: '45.5',
			longitude: '-122.5',
		})

		const located = await locatePlace(values, vi.fn<AddressProvider>(), signal)

		expect(toPlaceDraft(values, located ?? undefined, [])).toMatchObject({
			address: '45.5, -122.5',
			latitude: 45.5,
			longitude: -122.5,
		})
	})

	it('takes the visit fields, with the photo keys, as the first visit of a new place', () => {
		const draft = toPlaceDraft(typed({ review: ' Great ' }), sherwood, [
			'users/u1/b.jpg',
			'users/u1/a.jpg',
		])

		expect(draft.visits).toEqual([
			{
				id: undefined,
				visitedAt: '2026-09-27',
				rating: 5,
				review: 'Great',
				photos: ['users/u1/b.jpg', 'users/u1/a.jpg'],
			},
		])
	})

	it('keeps a half-step rating, and rounds any other fraction to the nearest half', () => {
		expect(toPlaceDraft(typed({ rating: 3.5 }), sherwood, []).visits[0]?.rating).toBe(3.5)

		expect(toPlaceDraft(typed({ rating: 3.3 }), sherwood, []).visits[0]?.rating).toBe(3.5)
	})

	it('keeps the visits on record, with their photo keys, through an edit of the place', () => {
		const base = place('p1', { visits: [visitWith('v1', [photo('users/u1/a.jpg')])] })

		const values = targetValues({ kind: 'place', place: base })

		expect(toPlaceDraft({ ...values, rating: 1 }, values.place, [], base).visits).toEqual([
			{ id: 'v1', visitedAt: '2026-08-15', rating: 4, photos: ['users/u1/a.jpg'] },
		])
	})

	it('keeps the parts on record while an edit keeps its own match', () => {
		const base = place('p1', { city: 'Portland', state: 'Oregon', country: 'United States' })

		const values = targetValues({ kind: 'place', place: base })

		const draft = toPlaceDraft({ ...values, address: 'Edited line' }, values.place, [], base)

		expect(draft).toMatchObject({
			address: 'Edited line',
			city: 'Portland',
			country: 'United States',
			latitude: base.latitude,
		})
	})
})

describe('toVisitPlaceDraft', () => {
	const base = place('p1', {
		visits: [
			{ id: 'v2', visitedAt: '2026-08-15', rating: 4, photos: [photo('users/u1/a.jpg')] },
			{ id: 'v1', visitedAt: '2026-01-02', rating: 2, photos: [photo('users/u1/b.jpg')] },
		],
	})

	it('adds a new visit, with no id, and keeps the place as it is', () => {
		const draft = toVisitPlaceDraft(typed({ visitedAt: new Date(2026, 9, 1) }), base, null, [])

		expect(draft).not.toHaveProperty('id')

		expect(draft.name).toBe(base.name)

		expect(draft.visits.map((visit) => visit.id)).toEqual(['v2', 'v1', undefined])

		expect(draft.visits[2]?.visitedAt).toBe('2026-10-01')

		expect(draft.visits[0]?.photos).toEqual(['users/u1/a.jpg'])
	})

	it('replaces the stored visit it edits, and keeps its id', () => {
		const visit = base.visits[1] ?? null

		const values = targetValues({ kind: 'visit', place: base, visit })

		expect(values.photos).toEqual([photo('users/u1/b.jpg')])

		const draft = toVisitPlaceDraft({ ...values, rating: 5 }, base, visit, [
			'users/u1/b.jpg',
			'users/u1/c.jpg',
		])

		expect(draft.visits).toEqual([
			{ id: 'v2', visitedAt: '2026-08-15', rating: 4, photos: ['users/u1/a.jpg'] },
			{
				id: 'v1',
				visitedAt: '2026-01-02',
				rating: 5,
				review: undefined,
				photos: ['users/u1/b.jpg', 'users/u1/c.jpg'],
			},
		])
	})
})
