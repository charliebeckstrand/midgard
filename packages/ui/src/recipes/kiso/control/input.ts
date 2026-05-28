/**
 * Control archetype — input element. Resets the inner `<input>` /
 * `<textarea>` so the frame chrome owns the visible surface and the input
 * inherits text colour and placeholder treatment from the design tokens.
 *
 * Layer: kiso · Archetype: control · Concern: input
 */

import { iro } from '../iro'

export const input = [
	'relative',
	'w-full min-w-0 flex-1',
	'border-0',
	'bg-transparent',
	'focus:outline-hidden',
	'read-only:bg-transparent',
	...iro.text.default,
	'placeholder:text-zinc-500',
	'dark:placeholder:text-zinc-400',
]
