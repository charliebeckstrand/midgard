/**
 * Control archetype — element-specific resets. The `number` reset hides
 * native spinners and switches `<input type="number">` to text appearance
 * so the design-system chrome owns the visible surface end-to-end.
 *
 * Layer: kiso · Archetype: control · Concern: resets
 */

export const resets = {
	number: [
		'[appearance:textfield]',
		'[&::-webkit-inner-spin-button]:m-0',
		'[&::-webkit-inner-spin-button]:appearance-none',
		'[&::-webkit-outer-spin-button]:appearance-none',
	],
}
