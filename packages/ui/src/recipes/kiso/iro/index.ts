/**
 * Iro (色): the color tokens of the kata. The chromatic `palette`, its
 * `extended` hues and its `hover`, the semantic intent-color text bundle, the
 * `match` wash of a search match, and the `on.wash` rung for the neutral wash.
 * The shade of a measured value is `zu.meter`, and the shade of a chromatic dot
 * or glyph is `zu.marker`.
 *
 * `text` is keyed by purpose; `on.wash` is keyed by the ground it inks, so it
 * sits beside it rather than inside it. `on.wash` is then keyed by purpose in
 * turn, since what varies on that ground is emphasis.
 *
 * `palette` and `hover` are the one source of each chromatic class of a variant: Alert,
 * Avatar, Badge, Button, and each kata that writes a hue as text or as a wash
 * read them.
 *
 * Surfaces live in `omote`. Interaction-state text colors live in
 * `hannou.fg`. Slot-specific composites live in their kata.
 */

import { intent } from './intent'
import { extended, hover, palette } from './palette'
import { match, onWash } from './ramp'

export const iro = {
	palette,
	extended,
	hover,
	text: intent,
	match,
	on: { wash: onWash },
} as const
