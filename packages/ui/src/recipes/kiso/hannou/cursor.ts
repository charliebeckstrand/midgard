/**
 * Hannou cursor — pointer feedback that tracks disabled state. The bare
 * `cursor-pointer` sits at one-class specificity. Disabled variants
 * below override it on the element or its descendants; parent overrides
 * like `has-disabled:**:cursor-not-allowed` win for sibling-label
 * patterns.
 *
 * Layer: kiso · Concern: pointer feedback
 */

export const cursor = [
	'cursor-pointer',
	'disabled:cursor-not-allowed data-disabled:cursor-not-allowed has-[:disabled]:cursor-not-allowed has-[data-disabled]:cursor-not-allowed',
]
