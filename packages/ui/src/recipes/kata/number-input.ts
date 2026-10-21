/**
 * NumberInput kata: the classes that NumberInput adds to its Input. `field`
 * hides the native spinners, and gives `<input type="number">` the look of
 * text.
 */
export const k = {
	field: [
		'[appearance:textfield]',
		'[&::-webkit-inner-spin-button]:m-0',
		'[&::-webkit-inner-spin-button]:appearance-none',
		'[&::-webkit-outer-spin-button]:appearance-none',
		'tabular-nums',
	],
}
