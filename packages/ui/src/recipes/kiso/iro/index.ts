/**
 * Iro (色): the color tokens of the kata. The chromatic `palette`, its
 * `extended` hues and its `hover`, the semantic intent-color text bundle, the `marker` shade for
 * chromatic dots / glyphs, the `meter` shade for a measured value, and the
 * `on.wash` rung for the neutral wash.
 *
 * `text` is keyed by purpose; `marker` and `on.wash` are keyed by the ground
 * they ink, so they sit beside it rather than inside it. `on.wash` is then
 * keyed by purpose in turn, since what varies on that ground is emphasis.
 *
 * `palette` and `hover` are the one source of each chromatic class: Alert,
 * Avatar, Badge, Button, and each kata that writes a hue as text or as a wash
 * read them.
 *
 * Surfaces live in `omote`. Interaction-state text colors live in
 * `hannou.fg`. Slot-specific composites live in their kata.
 */

import { intent } from './intent'
import { meter } from './meter'
import { extended, hover, palette } from './palette'
import { marker, onWash } from './ramp'

export const iro = {
	palette,
	extended,
	hover,
	text: intent,
	marker,
	meter,
	on: { wash: onWash },
} as const
