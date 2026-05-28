/**
 * Iro (色) — colour. The palette matrix, keyed by variant
 * (solid / soft / outline / plain / bare) × colour × slot
 * (bg / text / hover / ring / border), plus the semantic intent-colour
 * text bundle. One file per palette variant; this barrel assembles the
 * named bundle that every kata reads.
 *
 * Surfaces live in `omote`. Interaction-state text colours live in
 * `hannou.text`. Slot-specific composites live in their kata.
 */

import { bare } from './bare'
import { intent } from './intent'
import { outline } from './outline'
import { plain } from './plain'
import { soft } from './soft'
import { solid } from './solid'

export const iro = {
	palette: { solid, soft, outline, plain, bare },
	text: intent,
} as const
