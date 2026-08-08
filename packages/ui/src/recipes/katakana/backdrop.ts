/**
 * Backdrop bridge: the modal scrim shared by `drawer` and `sheet`. A pure
 * bridge: it receives the `omote.backdrop` tokens from the calling kata and
 * returns the standard `defineRecipe` for a full-bleed backdrop with a
 * `surface` axis (`flat` scrim, denser `glass` fill) and a `desaturate` axis
 * (colour drained from what shows through), referencing kiso in neither value
 * nor type.
 *
 * Dialog has no backdrop of this shape, so unlike `panel` this isn't wired
 * through the panel bridge; the two modal edge-panels call it directly and
 * hand the result to `bridge.panel(…, { backdrop })`.
 */

import type { ClassValue } from 'clsx'

import { defineRecipe } from '../../core/recipe'

/** The `omote.backdrop` tokens the bridge reads. */
type BackdropTokens = {
	/** Default modal scrim — the `flat` surface. */
	base: ClassValue
	/** Denser fill for use behind a glass panel — the `glass` surface. */
	glass: ClassValue
	/** Filter draining colour from what shows through — the `desaturate` axis. */
	grayscale: ClassValue
}

/**
 * Build the backdrop recipe from a `base` / `glass` fill pair and the
 * desaturating filter.
 *
 * @param t - The `omote.backdrop` token bundle (`base` scrim, `glass` fill,
 * `grayscale` filter).
 * @returns A `defineRecipe` result with a `surface` axis defaulting to `flat`
 * and a `desaturate` axis defaulting to off.
 */
export function backdrop(t: BackdropTokens) {
	return defineRecipe({
		base: 'absolute inset-0',
		surface: {
			glass: t.glass,
			flat: t.base,
		},
		desaturate: {
			true: t.grayscale,
			false: '',
		},
		defaults: { surface: 'flat', desaturate: false },
	})
}
