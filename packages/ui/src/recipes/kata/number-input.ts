/**
 * NumberInput kata: the classes that NumberInput adds to its Input. They
 * hide the native spinners, and give `<input type="number">` the look of
 * text.
 */
import { defineKata } from '../../core/recipe'

export const k = defineKata({
	base: [
		'[appearance:textfield]',
		'[&::-webkit-inner-spin-button]:m-0',
		'[&::-webkit-inner-spin-button]:appearance-none',
		'[&::-webkit-outer-spin-button]:appearance-none',
		'tabular-nums',
	],
})
