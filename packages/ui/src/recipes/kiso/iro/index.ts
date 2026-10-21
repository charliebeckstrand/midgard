/**
 * Iro (色): color tokens that many kata read by purpose. The semantic
 * intent-color text bundle, the `marker` shade for chromatic dots / glyphs,
 * the `meter` shade for a measured value, and the `on.wash` rung for the
 * neutral wash.
 *
 * `text` is keyed by purpose; `marker` and `on.wash` are keyed by the ground
 * they ink, so they sit beside it rather than inside it. `on.wash` is then
 * keyed by purpose in turn, since what varies on that ground is emphasis.
 *
 * The palette of a chromatic kata (Alert, Avatar, Badge, Button) is not here.
 * Each of those kata writes one literal class string for each variant and
 * color in its own `definePalette` matrix.
 *
 * Surfaces live in `omote`. Interaction-state text colors live in
 * `hannou.fg`. Slot-specific composites live in their kata.
 */

import { intent } from './intent'
import { meter } from './meter'
import { marker, onWash } from './ramp'

export const iro = {
	text: intent,
	marker,
	meter,
	on: { wash: onWash },
} as const
