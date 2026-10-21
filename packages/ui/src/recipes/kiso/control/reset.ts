/**
 * Control archetype: input element resets. `base` strips the inner `<input>` /
 * `<textarea>` to transparent with no border; the input inherits text color
 * and placeholder treatment from the design tokens. `input.ts` composes it
 * with the kasane corner radius to form the standard text-input base. `number`
 * hides the native spinners and switches `<input type="number">` to text
 * appearance.
 *
 * Layer: kiso · Archetype: control · Concern: input reset
 */

import { iro } from '../iro'

const { text } = iro

export const reset = {
	base: [
		'relative',
		'w-full min-w-0 flex-1',
		'bg-transparent read-only:bg-transparent',
		'border-0',
		...text.default,
		'placeholder:text-zinc-500 dark:placeholder:text-zinc-400',
		// The control frame draws the focus ring, and its forced-colors outline.
		'focus:outline-none',
	],
	number: [
		'[appearance:textfield]',
		'[&::-webkit-inner-spin-button]:m-0',
		'[&::-webkit-inner-spin-button]:appearance-none',
		'[&::-webkit-outer-spin-button]:appearance-none',
	],
} as const
