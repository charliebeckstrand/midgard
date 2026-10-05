/**
 * Hannou active: mode-neutral background wash on the keyboard-roved item
 * (`data-active`), the counterpart to `tint`'s hover/focus wash at the same
 * 5% intensity. Consumed by the listbox katas whose roving cursor marks the
 * active row with `data-active` (`kata/option`, `kata/menu`, `kata/command-palette`).
 *
 * A roved row does not take focus, so this wash is the only mark of the cursor.
 * Thus it has the two forms of the hover/focus wash. Inside a glass parent it
 * takes the step of `glassItem`, where 5% reads as nothing. Under forced colors
 * it maps to `Highlight` and `HighlightText`, as `sen.forced.focus` does for a
 * focused row. The forced pair wins with `!` over each wash and hover step,
 * because a hovered row is often the roved row.
 *
 * Layer: kiso · Concern: active (roved) tint
 */

import { mode } from '../../../core/recipe'

export const active = [
	...mode(
		'data-active:bg-zinc-950/5 group-data-[glass]/glass:data-active:bg-zinc-950/10',
		'dark:data-active:bg-white/5 dark:group-data-[glass]/glass:data-active:bg-white/10',
	),
	'forced-colors:data-active:bg-[Highlight]! forced-colors:data-active:text-[HighlightText]!',
]
