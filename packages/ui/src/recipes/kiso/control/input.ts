/**
 * Control archetype — input element. Resets the inner `<input>` /
 * `<textarea>` so the frame chrome owns the visible surface and the input
 * inherits text colour and placeholder treatment from the design tokens.
 *
 * `input` is the bare reset; `inputBase` is the standard text-input base
 * for the applicator — `input` plus the kasane rounded-lg corner. Lives
 * here so the applicator imports a single pre-assembled fragment instead
 * of composing in its file.
 *
 * Layer: kiso · Archetype: control · Concern: input
 */

import { iro } from '../iro'
import { kasane } from '../kasane'

export const input = [
	'relative',
	'w-full min-w-0 flex-1',
	'bg-transparent read-only:bg-transparent',
	'border-0',
	...iro.text.default,
	'placeholder:text-zinc-500 dark:placeholder:text-zinc-400',
	'focus:outline-hidden',
]

export const inputBase = [...input, kasane.rounded.lg]
