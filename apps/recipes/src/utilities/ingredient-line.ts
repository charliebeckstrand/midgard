import { UNITS } from '../constants'
import type { Ingredient } from '../types'

/**
 * The ingredient list, read and written as text.
 *
 * A recipe is copied off a page or out of a head, one line at a time, and a
 * repeating three-field row makes the reader tab through a form to type what
 * they could have typed as a sentence. So the form takes lines, and this reads
 * them: `2 kg potatoes` is a quantity, a unit, and an item, and `salt, to
 * taste` is an item.
 *
 * Both directions live here because they must agree. A line the form writes for
 * an edit has to read back as the record it came from, or a save the reader made
 * no change to would quietly rewrite the list.
 */

/** `1 1/2`, `1/2`, `1.5`, or `2` at the head of a line, with the rest after it. */
const QUANTITY = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s+(.*)$/

/** A mixed or plain fraction as a number, or `null` where it is neither. */
function amount(text: string): number | null {
	const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(text)

	if (mixed) {
		const [, whole, top, bottom] = mixed

		return Number(bottom) === 0 ? null : Number(whole) + Number(top) / Number(bottom)
	}

	const fraction = /^(\d+)\/(\d+)$/.exec(text)

	if (fraction) {
		const [, top, bottom] = fraction

		return Number(bottom) === 0 ? null : Number(top) / Number(bottom)
	}

	const plain = Number(text)

	return Number.isFinite(plain) ? plain : null
}

/**
 * One typed line as an ingredient.
 *
 * A quantity is only read where a unit or an item follows it, so `12` alone
 * stays an item — a reader who wrote it meant something by it, and a line with
 * an amount and nothing to measure is not one this app can draw.
 *
 * A unit is only read from the known list. Anything else is the first word of
 * the item, because "2 large onions" measures onions in nothing and `large` is
 * not a unit the app should invent.
 *
 * `null` for a line with no item, which is what a blank line is.
 */
export function parseIngredientLine(line: string): Ingredient | null {
	const text = line.trim()

	if (text === '') return null

	const parts = QUANTITY.exec(text)

	if (parts === null) return { item: text }

	const [, head, rest] = parts

	const quantity = amount(head ?? '')

	if (quantity === null || quantity <= 0 || rest === undefined || rest.trim() === '') {
		return { item: text }
	}

	const [first = '', ...others] = rest.trim().split(/\s+/)

	const unit = UNITS.find((known) => known === first.toLowerCase().replace(/\.$/, ''))

	if (unit === undefined) return { quantity, item: rest.trim() }

	const item = others.join(' ')

	// A unit with nothing after it measures nothing, so the word goes back to
	// being the item: "2 cups" is a line about cups.
	if (item === '') return { quantity, item: rest.trim() }

	return { quantity, unit, item }
}

/** Every line of a block that reads as an ingredient, in order. */
export function parseIngredientLines(block: string): Ingredient[] {
	return block
		.split('\n')
		.map(parseIngredientLine)
		.filter((line): line is Ingredient => line !== null)
}

/**
 * One ingredient written back as a line.
 *
 * The inverse of the read above, so a record dressed as text and parsed again is
 * the record it started as.
 */
export function formatIngredient({ quantity, unit, item }: Ingredient): string {
	return [quantity, unit, item].filter((part) => part !== undefined && part !== '').join(' ')
}

/** A whole list written back as a block, one line each. */
export function formatIngredients(lines: readonly Ingredient[]): string {
	return lines.map(formatIngredient).join('\n')
}

/** Every non-blank line of a block, trimmed — which is what a list of steps is. */
export function parseLines(block: string): string[] {
	return block
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line !== '')
}
