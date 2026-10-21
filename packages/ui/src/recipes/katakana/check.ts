/**
 * Check bridge: the check-input branch of the Control family. A pure bridge:
 * it receives the `control` token bundle from the calling kata and wires it
 * into a recipe surface, importing only the recipe engine. It declares the
 * token shape it needs as its own contract (`CheckTokens`); katakana
 * references kiso in neither value nor type. The framed text and picker
 * controls extend the control group (`kumi/control`) instead.
 *
 * `check(t, overlay)` returns the native `<input>` overlaid on the
 * `check.surface` chrome (`checkbox`, `radio`). `switch` reads only
 * `check.hidden` and uses `defineRecipe` directly.
 */

import type { ClassValue } from 'clsx'
import { applyRecipe, defineRecipe, type RecipeConfig } from '../../core/recipe'

type Empty = Record<never, never>

/** The slice of the `control` token bundle the bridge reads. */
type CheckTokens = {
	check: { base: ClassValue; hidden: ClassValue }
}

/**
 * Wire the check-input branch (`checkbox`, `radio`). It returns a
 * visually-hidden native `<input>` (`k.input`) over the `check.surface` chrome.
 * `switch` reads `check.hidden` and uses `defineRecipe` directly instead.
 */
export function check<
	Overlay extends RecipeConfig = Empty,
	Extras extends Record<string, unknown> = Empty,
>(t: CheckTokens, overlay?: Overlay, extras?: Extras) {
	return applyRecipe(
		{
			config: {
				base: t.check.base,
				defaults: { color: 'zinc' },
			},
			extras: {
				/** Visually-hidden native `<input>` overlaying the custom check surface. */
				input: defineRecipe({ base: t.check.hidden }),
			},
		},
		overlay,
		extras,
	)
}
