/**
 * Slider archetype: the rings of the native thumb of `<Slider />`, in the
 * WebKit and the Gecko form. Tailwind reads only literal class names, so each
 * pseudo-element writes its own rings.
 *
 * A ring is a box-shadow, which forced colors remove. Under forced colors the
 * slider shows the native range (`forced.control`), which paints its thumb in
 * system colors. The outline of the input marks the focus.
 *
 * Layer: kiso · Archetype: slider · Concern: thumb rings
 */

import { forced } from '../sen/forced'

export const thumb = [
	forced.control,
	...forced.ring.outset,
	// Forced colors show the native range, so an invalid slider outlines the input there.
	...forced.invalid.outset,

	'[&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-zinc-950/20',
	'dark:[&::-webkit-slider-thumb]:ring-white/20',
	// An invalid slider rings its thumb in red, as an invalid checkbox rings its box.
	'data-invalid:[&::-webkit-slider-thumb]:ring-2',
	'data-invalid:[&::-webkit-slider-thumb]:ring-red-600',
	'focus-visible:[&::-webkit-slider-thumb]:ring-4',
	'focus-visible:[&::-webkit-slider-thumb]:ring-blue-600',
	'dark:focus-visible:[&::-webkit-slider-thumb]:ring-blue-500',

	'[&::-moz-range-thumb]:ring-1 [&::-moz-range-thumb]:ring-zinc-950/20',
	'dark:[&::-moz-range-thumb]:ring-white/20',
	'data-invalid:[&::-moz-range-thumb]:ring-2',
	'data-invalid:[&::-moz-range-thumb]:ring-red-600',
	'focus-visible:[&::-moz-range-thumb]:ring-4',
	'focus-visible:[&::-moz-range-thumb]:ring-blue-600',
	'dark:focus-visible:[&::-moz-range-thumb]:ring-blue-500',
]
