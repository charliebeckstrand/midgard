/**
 * Iro (色): colour. The palette matrix, keyed by variant
 * (solid / soft / outline / plain / bare) × colour × slot
 * (bg / text / hover / ring / border), plus the semantic intent-colour
 * text bundle and the `marker` shade for chromatic dots / glyphs. One file
 * per palette variant; this barrel assembles the named bundle that every
 * kata reads.
 *
 * `palette` is the standard five-colour set (zinc / red / amber / green /
 * blue). `extendedPalette` is the opt-in wide palette — the same shape keyed
 * by every standard colour plus the extended set (rose / violet / sky); a
 * kata reads it in place of `palette` to offer the broader `color` axis.
 *
 * Surfaces live in `omote`. Interaction-state text colours live in
 * `hannou.fg`. Slot-specific composites live in their kata.
 */

import { bare } from './bare'
import { extendedPalette } from './extended-palette'
import { intent } from './intent'
import { outline } from './outline'
import { plain } from './plain'
import { marker } from './ramp'
import { soft } from './soft'
import { solid } from './solid'

export const iro = {
	palette: { solid, soft, outline, plain, bare },
	extendedPalette,
	text: intent,
	marker,
} as const
