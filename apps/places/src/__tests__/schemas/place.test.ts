import { describe, expect, it } from 'vitest'
import { isWebAddress, parsePlace, parsePlaceDraft } from '../../schemas/place'

/** A body that passes every check, which each case below breaks one field of. */
const VALID = {
	name: 'Clearwater',
	category: 'food',
	address: '325 SW Bay Blvd, Newport, Oregon',
	latitude: 44.63,
	longitude: -124.05,
	rating: 4,
	visitedAt: '2026-08-15',
}

describe('isWebAddress', () => {
	it('takes http and https', () => {
		expect(isWebAddress('https://example.com')).toBe(true)

		expect(isWebAddress('http://example.com/a?b=c')).toBe(true)
	})

	it('refuses every other scheme, and anything that is not an address', () => {
		expect(isWebAddress('javascript:alert(1)')).toBe(false)

		expect(isWebAddress('data:text/html,<script>')).toBe(false)

		expect(isWebAddress('ftp://example.com')).toBe(false)

		expect(isWebAddress('example.com')).toBe(false)
	})
})

describe('parsePlaceDraft', () => {
	it('reads a complete body', () => {
		const parsed = parsePlaceDraft(VALID)

		expect(parsed.ok).toBe(true)

		if (!parsed.ok) return

		expect(parsed.value.name).toBe('Clearwater')

		expect(parsed.value.category).toBe('food')

		expect(parsed.value.visitedAt).toBe('2026-08-15')
	})

	it('refuses a body that is not an object', () => {
		expect(parsePlaceDraft(null).ok).toBe(false)

		expect(parsePlaceDraft([]).ok).toBe(false)

		expect(parsePlaceDraft('a place').ok).toBe(false)
	})

	// The collection is the point: a bad body answers with everything wrong with
	// it, rather than one round trip per field.
	it('collects every failure at once', () => {
		const parsed = parsePlaceDraft({})

		expect(parsed.ok).toBe(false)

		if (parsed.ok) return

		expect(parsed.issues).toHaveLength(6)

		expect(parsed.issues).toEqual(
			expect.arrayContaining([
				'`name` is required.',
				'`category` is not one of the known categories.',
				'`address` is required.',
				'`latitude` must be a number between -90 and 90.',
				'`longitude` must be a number between -180 and 180.',
				'`visitedAt` must be a YYYY-MM-DD day.',
			]),
		)
	})

	// An absent rating is a place added without one, which is the default the form
	// submits — so it must not read as a failure.
	it('takes an absent rating as nothing scored', () => {
		const parsed = parsePlaceDraft({ ...VALID, rating: undefined })

		expect(parsed.ok).toBe(true)

		if (!parsed.ok) return

		expect(parsed.value.rating).toBe(0)
	})

	it('refuses a rating that is not a whole score in range', () => {
		expect(parsePlaceDraft({ ...VALID, rating: 6 }).ok).toBe(false)

		expect(parsePlaceDraft({ ...VALID, rating: -1 }).ok).toBe(false)

		expect(parsePlaceDraft({ ...VALID, rating: 3.5 }).ok).toBe(false)
	})

	it('refuses a coordinate off the globe, or one that is not a number', () => {
		expect(parsePlaceDraft({ ...VALID, latitude: 91 }).ok).toBe(false)

		expect(parsePlaceDraft({ ...VALID, longitude: 181 }).ok).toBe(false)

		expect(parsePlaceDraft({ ...VALID, latitude: Number.NaN }).ok).toBe(false)

		expect(parsePlaceDraft({ ...VALID, longitude: '-124.05' }).ok).toBe(false)
	})

	it('refuses a visit that is not a day', () => {
		expect(parsePlaceDraft({ ...VALID, visitedAt: '15-08-2026' }).ok).toBe(false)

		expect(parsePlaceDraft({ ...VALID, visitedAt: '2026-13-01' }).ok).toBe(false)

		expect(parsePlaceDraft({ ...VALID, visitedAt: '2026-08-15T10:00:00Z' }).ok).toBe(false)
	})

	// Both fields reach the document — one as an `href`, one as an `src` — so a
	// scheme that carries script must not survive the parse.
	it('drops a url or a photo that is not an http address', () => {
		const parsed = parsePlaceDraft({
			...VALID,
			url: 'javascript:alert(1)',
			photo: 'data:text/html,<script>',
		})

		expect(parsed.ok).toBe(true)

		if (!parsed.ok) return

		expect(parsed.value.url).toBeUndefined()

		expect(parsed.value.photo).toBeUndefined()
	})

	it('keeps a url and a photo that are http addresses', () => {
		const parsed = parsePlaceDraft({
			...VALID,
			url: ' https://example.com ',
			photo: 'http://example.com/a.jpg',
		})

		expect(parsed.ok).toBe(true)

		if (!parsed.ok) return

		expect(parsed.value.url).toBe('https://example.com')

		expect(parsed.value.photo).toBe('http://example.com/a.jpg')
	})

	it('trims the text it keeps, and drops a field left empty', () => {
		const parsed = parsePlaceDraft({
			...VALID,
			name: '  Clearwater  ',
			city: '   ',
			review: ' ok ',
		})

		expect(parsed.ok).toBe(true)

		if (!parsed.ok) return

		expect(parsed.value.name).toBe('Clearwater')

		expect(parsed.value.city).toBeUndefined()

		expect(parsed.value.review).toBe('ok')
	})
})

describe('parsePlace', () => {
	const STORED = { ...VALID, id: 'a1', createdAt: '2026-08-15T18:00:00.000Z' }

	it('reads a stored record', () => {
		const parsed = parsePlace(STORED)

		expect(parsed.ok).toBe(true)

		if (!parsed.ok) return

		expect(parsed.value.id).toBe('a1')

		expect(parsed.value.createdAt).toBe('2026-08-15T18:00:00.000Z')
	})

	// The store's own guard: a hand-edited file must not put a record with no
	// identity, or a point with no position, on the map.
	it('refuses a record with no id and one with no timestamp', () => {
		expect(parsePlace({ ...STORED, id: undefined }).ok).toBe(false)

		expect(parsePlace({ ...STORED, createdAt: 'yesterday' }).ok).toBe(false)
	})

	it('refuses a record the draft parse refuses', () => {
		expect(parsePlace({ ...STORED, latitude: 'north' }).ok).toBe(false)
	})
})
