import { describe, expect, it } from 'vitest'
import {
	formatIngredient,
	formatIngredients,
	parseIngredientLine,
	parseIngredientLines,
	parseLines,
} from '../../utilities/ingredient-line'

describe('parseIngredientLine', () => {
	it('answers with nothing for a blank line', () => {
		expect(parseIngredientLine('   ')).toBeNull()
	})

	it('reads a quantity, a unit, and an item', () => {
		expect(parseIngredientLine('2 kg potatoes')).toEqual({
			quantity: 2,
			unit: 'kg',
			item: 'potatoes',
		})
	})

	it('reads a decimal and a fraction', () => {
		expect(parseIngredientLine('1.5 l stock')).toMatchObject({ quantity: 1.5, unit: 'l' })

		expect(parseIngredientLine('1/2 cup rice')).toMatchObject({ quantity: 0.5, unit: 'cup' })

		expect(parseIngredientLine('1 1/2 tsp salt')).toMatchObject({ quantity: 1.5, unit: 'tsp' })
	})

	it('takes a unit however the reader cased or stopped it', () => {
		expect(parseIngredientLine('2 Kg. potatoes')).toMatchObject({ unit: 'kg', item: 'potatoes' })
	})

	it('reads a quantity with no unit', () => {
		expect(parseIngredientLine('2 eggs')).toEqual({ quantity: 2, item: 'eggs' })
	})

	it('reads a line with no quantity at all', () => {
		expect(parseIngredientLine('salt, to taste')).toEqual({ item: 'salt, to taste' })
	})

	// `large` is not a unit this app should invent, so it goes back to being the
	// first word of the item.
	it('keeps an unknown word as part of the item', () => {
		expect(parseIngredientLine('2 large onions')).toEqual({ quantity: 2, item: 'large onions' })
	})

	// A reader who wrote a bare number meant something by it, and a line with an
	// amount and nothing to measure is not one the app can draw.
	it('keeps a bare number as the item', () => {
		expect(parseIngredientLine('12')).toEqual({ item: '12' })
	})

	// "2 cups" is a line about cups.
	it('keeps a unit with nothing after it as the item', () => {
		expect(parseIngredientLine('2 cups')).toEqual({ quantity: 2, item: 'cups' })
	})

	it('refuses a quantity of nothing', () => {
		expect(parseIngredientLine('0 kg potatoes')).toEqual({ item: '0 kg potatoes' })
	})

	it('refuses a fraction over nothing', () => {
		expect(parseIngredientLine('1/0 cup rice')).toEqual({ item: '1/0 cup rice' })
	})
})

describe('parseIngredientLines', () => {
	it('reads a block, dropping the blank lines', () => {
		expect(parseIngredientLines('2 kg potatoes\n\nsalt\n')).toEqual([
			{ quantity: 2, unit: 'kg', item: 'potatoes' },
			{ item: 'salt' },
		])
	})
})

describe('formatIngredient', () => {
	it('writes each shape back as a line', () => {
		expect(formatIngredient({ quantity: 2, unit: 'kg', item: 'potatoes' })).toBe('2 kg potatoes')

		expect(formatIngredient({ quantity: 2, item: 'eggs' })).toBe('2 eggs')

		expect(formatIngredient({ item: 'salt' })).toBe('salt')
	})

	// A save the reader made no change to must write the record it opened on,
	// rather than a re-punctuated copy of it.
	it('round-trips every shape the parser produces', () => {
		for (const line of ['2 kg potatoes', '2 eggs', 'salt, to taste', '0.5 l stock']) {
			const parsed = parseIngredientLine(line)

			expect(parsed).not.toBeNull()

			if (parsed !== null) expect(formatIngredient(parsed)).toBe(line)
		}
	})

	it('writes a whole list back as a block', () => {
		expect(formatIngredients([{ quantity: 1, unit: 'kg', item: 'flour' }, { item: 'water' }])).toBe(
			'1 kg flour\nwater',
		)
	})
})

describe('parseLines', () => {
	it('keeps every line that carries text, trimmed', () => {
		expect(parseLines('  Dice.  \n\n Simmer. \n')).toEqual(['Dice.', 'Simmer.'])
	})

	it('answers with nothing for an empty block', () => {
		expect(parseLines('\n  \n')).toEqual([])
	})
})
