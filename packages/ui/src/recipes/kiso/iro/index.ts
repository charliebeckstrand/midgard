/**
 * Iro (色): color. The palette matrix, keyed by variant
 * (solid / soft / outline / plain / bare) × color × slot
 * (bg / text / hover / ring). Beside it sit the semantic intent-color text
 * bundle, the `marker` shade for chromatic dots / glyphs, the `meter` shade
 * for a measured value, and the `on.wash` rung for the neutral wash. One file per palette variant; this barrel
 * assembles the named bundle that every kata reads.
 *
 * `text` is keyed by purpose; `marker` and `on.wash` are keyed by the ground
 * they ink, so they sit beside it rather than inside it. `on.wash` is then
 * keyed by purpose in turn, since what varies on that ground is emphasis.
 *
 * `palette` is the standard five-color set (zinc / red / amber / green /
 * blue). `matrix` holds its solid, soft, and outline slots in the form that
 * `definePalette` takes. `extended` is the opt-in wide palette: the same shape keyed by every
 * standard color plus the extended set (rose / violet / sky). A kata reads it
 * in place of `palette` to offer the broader `color` axis.
 *
 * Surfaces live in `omote`. Interaction-state text colors live in
 * `hannou.fg`. Slot-specific composites live in their kata.
 */

import { bare } from './bare'
import { extendedPalette } from './extended-palette'
import { intent } from './intent'
import { matrix } from './matrix'
import { meter } from './meter'
import { outline } from './outline'
import { plain } from './plain'
import { marker, onWash } from './ramp'
import { soft } from './soft'
import { solid } from './solid'

const palette = { solid, soft, outline, plain, bare }

export const iro = {
	palette,
	extended: extendedPalette,
	/**
	 * The solid, soft, and outline slots of `palette` and of `extended`, in the
	 * form that `definePalette` takes. The chromatic surfaces read it.
	 */
	matrix: { palette: matrix(palette), extended: matrix(extendedPalette) },
	text: intent,
	marker,
	meter,
	on: { wash: onWash },
} as const
