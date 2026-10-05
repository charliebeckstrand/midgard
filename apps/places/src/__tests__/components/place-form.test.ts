import type { AddressProvider, AddressSuggestion } from 'ui/address-input'
import { describe, expect, it, vi } from 'vitest'
import {
	locatePlace,
	type PlaceValues,
	photoRow,
	placeValidators,
	toFormValues,
	toPlaceDraft,
	toVisitPlaceDraft,
} from '../../components/place-form-drawer/place-form'
import { place } from '../fixtures'

/** Filled values with no match, which is a place that the reader typed the address of. */
function typed(fields: Partial<PlaceValues> = {}): PlaceValues {
	return {
		place: undefined,
		name: "Stella's Ice Cream",
		address: '16020 SW Tualatin-Sherwood Rd, Sherwood, OR',
		category: 'food',
		url: '',
		visitedAt: new Date(2026, 8, 27),
		rating: 5,
		photos: [photoRow()],
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
	it('takes a place with no match, because the address locates it', () => {
		expect(placeValidators.place?.(undefined, typed())).toBeUndefined()
	})

	it('refuses a match with no position', () => {
		expect(placeValidators.place?.({ id: 'a', label: 'A' }, typed())).toBe(
			'That match has no position. Pick another.',
		)
	})

	it('requires the address', () => {
		expect(placeValidators.address?.('  ', typed())).toBe('Address is required.')
	})

	it('takes empty photo rows, and names the first row that is not a web address', () => {
		const rows = [photoRow(''), photoRow('https://example.com/a.jpg'), photoRow('nope')]

		expect(placeValidators.photos?.(rows.slice(0, 2), typed())).toBeUndefined()

		expect(placeValidators.photos?.(rows, typed())).toBe('Photo 3 is not a web address.')
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
})

describe('toPlaceDraft', () => {
	it('stores the typed address line and the position and parts of the match', () => {
		const draft = toPlaceDraft(typed(), sherwood)

		expect(draft).toMatchObject({
			address: '16020 SW Tualatin-Sherwood Rd, Sherwood, OR',
			city: 'Sherwood',
			state: 'Oregon',
			latitude: 45.36,
			longitude: -122.84,
		})
	})

	it('takes the visit fields as the first visit of a new place', () => {
		const draft = toPlaceDraft(
			typed({
				review: ' Great ',
				photos: [
					photoRow(' https://example.com/b.jpg '),
					photoRow(''),
					photoRow('https://example.com/a.jpg'),
				],
			}),
			sherwood,
		)

		expect(draft.visits).toEqual([
			{
				id: undefined,
				visitedAt: '2026-09-27',
				rating: 5,
				review: 'Great',
				photos: ['https://example.com/b.jpg', 'https://example.com/a.jpg'],
			},
		])
	})

	it('keeps a half-step rating, and rounds any other fraction to the nearest half', () => {
		expect(toPlaceDraft(typed({ rating: 3.5 }), sherwood).visits[0]?.rating).toBe(3.5)

		expect(toPlaceDraft(typed({ rating: 3.3 }), sherwood).visits[0]?.rating).toBe(3.5)
	})

	it('keeps the visits on record through an edit of the place', () => {
		const base = place('p1')

		const values = toFormValues(base)

		expect(toPlaceDraft({ ...values, rating: 1 }, values.place, base).visits).toBe(base.visits)
	})

	it('keeps the parts on record while an edit keeps its own match', () => {
		const base = place('p1', { city: 'Portland', state: 'Oregon', country: 'United States' })

		const values = toFormValues(base)

		const draft = toPlaceDraft({ ...values, address: 'Edited line' }, values.place, base)

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
			{ id: 'v2', visitedAt: '2026-08-15', rating: 4, photos: ['https://example.com/a.jpg'] },
			{ id: 'v1', visitedAt: '2026-01-02', rating: 2, photos: [] },
		],
	})

	it('adds a new visit, with no id, and keeps the place as it is', () => {
		const draft = toVisitPlaceDraft(typed({ visitedAt: new Date(2026, 9, 1) }), base, null)

		expect(draft).not.toHaveProperty('id')

		expect(draft.name).toBe(base.name)

		expect(draft.visits.map((visit) => visit.id)).toEqual(['v2', 'v1', undefined])

		expect(draft.visits[2]?.visitedAt).toBe('2026-10-01')
	})

	it('replaces the stored visit it edits, and keeps its id', () => {
		const visit = base.visits[1] ?? null

		const values = toFormValues(base, visit)

		expect(values.photos).toHaveLength(1)

		const draft = toVisitPlaceDraft({ ...values, rating: 5 }, base, visit)

		expect(draft.visits).toEqual([
			base.visits[0],
			{ id: 'v1', visitedAt: '2026-01-02', rating: 5, review: undefined, photos: [] },
		])
	})
})
