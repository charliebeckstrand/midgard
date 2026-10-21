/**
 * Control group: the reset of the field. It strips the inner `<input>`,
 * `<textarea>`, or `<button>` to transparent with no border. The field takes
 * the text color and the placeholder color of the design tokens.
 *
 * Layer: kumi · Group: control · Concern: input reset
 */

import { iro } from '../../kiso/iro'

const { text } = iro

export const reset = [
	'relative',
	'w-full min-w-0 flex-1',
	'bg-transparent read-only:bg-transparent',
	'border-0',
	...text.default,
	'placeholder:text-zinc-500 dark:placeholder:text-zinc-400',
	// The control frame draws the focus ring, and its forced-colors outline.
	'focus:outline-none',
] as const
