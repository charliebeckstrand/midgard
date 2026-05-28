/**
 * Control archetype — input element reset. Strips the inner
 * `<input>` / `<textarea>` so the frame chrome owns the visible surface
 * and the input inherits text colour and placeholder treatment from the
 * design tokens. `input.ts` composes this with the kasane corner radius
 * to form the standard text-input base.
 *
 * Layer: kiso · Archetype: control · Concern: input reset
 */

import { iro } from '../iro'

const { text } = iro

export const reset = [
	'relative',
	'w-full min-w-0 flex-1',
	'bg-transparent read-only:bg-transparent',
	'border-0',
	...text.default,
	'placeholder:text-zinc-500 dark:placeholder:text-zinc-400',
	'focus:outline-hidden',
]
