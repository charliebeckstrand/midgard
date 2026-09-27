import type { AddressProvider, AddressSuggestion } from 'ui/address-input'
import { describe, expect, it, vi } from 'vitest'
import {
	locatePlace,
	type PlaceValues,
	placeValidators,
	toFormValues,
	toPlaceDraft,
} from '../../components/place-form-drawer/place-form'
import { place } from '../fixtures'

/** Filled values with no match, which is a place that the reader typed the address of. */
function typed(fields: Partial<PlaceValues> = {}): PlaceValues {
	return {
		place: undefined,
		name: "Stella's Ice Cream",
		address: '16020 SW Tualatin-Sherwood Rd, Sherwood, OR',
		category: 'food',
		rating: 5,
		visitedAt: new Date(2026, 8, 27),
		url: '',
		photo: '',
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
