import { describe, expect, it } from 'vitest'
import {
	isDay,
	isLabel,
	isWebAddress,
	parseCookDraft,
	parseCookEvent,
	parsePlanEntry,
	parseRecipe,
	parseRecipeDraft,
} from '../../schemas/recipe'

/** The least a draft can carry and still be one. */
const DRAFT = { name: 'Chowder', servings: 4 }

describe('isDay', () => {
	it('takes a well-formed day', () => {
		expect(isDay('2026-08-17')).toBe(true)
	})

	// The shape alone would take this and hand back a date the calendar rolled
	// over into the next year.
	it('refuses a well-formed field that is not a date', () => {
		expect(isDay('2026-13-45')).toBe(false)
	})

	it('refuses anything that is not a day', () => {
		for (const value of ['', '17/08/2026', '2026-8-7', 20260817, null, undefined]) {
			expect(isDay(value)).toBe(false)
		}
	})
})

describe('isLabel', () => {
	it('takes a known label and refuses anything else', () => {
		expect(isLabel('quick')).toBe(true)
		expect(isLabel('delicious')).toBe(false)
		expect(isLabel(3)).toBe(false)
	})
})

describe('isWebAddress', () => {
	it('takes http and https', () => {
		expect(isWebAddress('https://example.com/one')).toBe(true)
		expect(isWebAddress('http://example.com')).toBe(true)
	})

	// The field reaches the document as a link's `href`, so anything that could
	// run must not survive the parse.
	it('refuses a script address and a relative one', () => {
		expect(isWebAddress('javascript:alert(1)')).toBe(false)
		expect(isWebAddress('/recipes/1')).toBe(false)
	})
})

describe('parseRecipeDraft', () => {
	it('refuses a body that is not an object', () => {
		expect(parseRecipeDraft('chowder')).toEqual({
			ok: false,
			issues: ['Body must be an object.'],
		})
	})

	it('takes the least a draft can carry', () => {
		const parsed = parseRecipeDraft(DRAFT)

		expect(parsed).toMatchObject({ ok: true, value: { name: 'Chowder', servings: 4 } })
	})

	// One round trip per field is the thing this schema exists to avoid.
	it('collects every issue rather than stopping at the first', () => {
		const parsed = parseRecipeDraft({})

		expect(parsed.ok).toBe(false)

		if (!parsed.ok) expect(parsed.issues).toHaveLength(2)
	})

	it('trims the name and refuses an empty one', () => {
		expect(parseRecipeDraft({ ...DRAFT, name: '  Chowder  ' })).toMatchObject({
			value: { name: 'Chowder' },
		})

		expect(parseRecipeDraft({ ...DRAFT, name: '   ' }).ok).toBe(false)
	})

	it('refuses servings that are not a whole count', () => {
		for (const servings of [0, -2, 2.5, '4', 1_000]) {
			expect(parseRecipeDraft({ name: 'Chowder', servings }).ok).toBe(false)
		}
	})

	it('takes times as whole minutes, zero included', () => {
		expect(parseRecipeDraft({ ...DRAFT, prepMinutes: 0, cookMinutes: 45 })).toMatchObject({
			value: { prepMinutes: 0, cookMinutes: 45 },
		})

		expect(parseRecipeDraft({ ...DRAFT, prepMinutes: -1 }).ok).toBe(false)
		expect(parseRecipeDraft({ ...DRAFT, cookMinutes: 1.5 }).ok).toBe(false)
	})

	it('keeps only the lines that carry an item', () => {
		const parsed = parseRecipeDraft({
			...DRAFT,
			ingredients: [
				{ quantity: 2, unit: 'kg', item: 'potatoes' },
				{ item: 'salt' },
				{ quantity: 1 },
				'butter',
			],
		})

		expect(parsed).toMatchObject({
			value: { ingredients: [{ quantity: 2, unit: 'kg', item: 'potatoes' }, { item: 'salt' }] },
		})
	})

	// Dropping a malformed quantity is kinder than refusing the line it was
	// attached to: the item is the part the reader cannot do without.
	it('drops a quantity that is not a positive number and keeps the item', () => {
		expect(
			parseRecipeDraft({ ...DRAFT, ingredients: [{ quantity: -1, item: 'salt' }] }),
		).toMatchObject({ value: { ingredients: [{ item: 'salt' }] } })
	})

	it('keeps only the steps that carry text', () => {
		expect(parseRecipeDraft({ ...DRAFT, steps: ['Dice.', '  ', 3, 'Simmer.'] })).toMatchObject({
			value: { steps: ['Dice.', 'Simmer.'] },
		})
	})

	it('keeps the known labels, deduplicated and in the order the constants list them', () => {
		expect(
			parseRecipeDraft({ ...DRAFT, labels: ['quick', 'delicious', 'want-to-try', 'quick'] }),
		).toMatchObject({ value: { labels: ['want-to-try', 'quick'] } })
	})

	it('drops a source address that is not http(s)', () => {
		expect(parseRecipeDraft({ ...DRAFT, sourceUrl: 'javascript:alert(1)' })).toMatchObject({
			value: { sourceUrl: undefined },
		})
	})
})

describe('parseRecipe', () => {
	const STORED = { ...DRAFT, id: 'r1', createdAt: '2026-08-15T18:00:00.000Z' }

	it('reads a stored record back', () => {
		expect(parseRecipe(STORED)).toMatchObject({ ok: true, value: { id: 'r1' } })
	})

	it('refuses a record with no id or no timestamp', () => {
		expect(parseRecipe({ ...STORED, id: undefined }).ok).toBe(false)
		expect(parseRecipe({ ...STORED, createdAt: 'whenever' }).ok).toBe(false)
	})

	// Both belong to the store rather than the draft, so a file written before
	// either existed still reads.
	it('defaults the order and the favourite mark rather than refusing', () => {
		expect(parseRecipe(STORED)).toMatchObject({ value: { order: 0, favorite: false } })

		expect(parseRecipe({ ...STORED, order: 3, favorite: true })).toMatchObject({
			value: { order: 3, favorite: true },
		})
	})

	it('takes only a true favourite mark, not a truthy one', () => {
		expect(parseRecipe({ ...STORED, favorite: 'yes' })).toMatchObject({
			value: { favorite: false },
		})
	})
})

describe('parseCookDraft and parseCookEvent', () => {
	it('takes a recipe and a day', () => {
		expect(parseCookDraft({ recipeId: 'r1', day: '2026-08-17' })).toEqual({
			ok: true,
			value: { recipeId: 'r1', day: '2026-08-17' },
		})
	})

	it('collects both issues at once', () => {
		const parsed = parseCookDraft({})

		expect(parsed.ok).toBe(false)

		if (!parsed.ok) expect(parsed.issues).toHaveLength(2)
	})

	it('refuses a day that is not one', () => {
		expect(parseCookDraft({ recipeId: 'r1', day: '2026-13-45' }).ok).toBe(false)
	})

	it('reads a stored cook back and refuses one with no identity', () => {
		const stored = {
			id: 'c1',
			recipeId: 'r1',
			day: '2026-08-17',
			createdAt: '2026-08-17T18:00:00.000Z',
		}

		expect(parseCookEvent(stored)).toEqual({ ok: true, value: stored })
		expect(parseCookEvent({ ...stored, id: '' }).ok).toBe(false)
	})
})

describe('parsePlanEntry', () => {
	it('defaults the position rather than refusing', () => {
		expect(parsePlanEntry({ id: 'p1', recipeId: 'r1', day: '2026-08-17' })).toMatchObject({
			value: { position: 0 },
		})
	})

	it('keeps a stated position', () => {
		expect(
			parsePlanEntry({ id: 'p1', recipeId: 'r1', day: '2026-08-17', position: 2 }),
		).toMatchObject({ value: { position: 2 } })
	})
})
