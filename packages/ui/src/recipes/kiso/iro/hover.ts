/**
 * Iro hover: low-alpha hover wash shared by soft / outline / plain
 * palette variants. Each tint is the colour at 15% opacity; the wash
 * sits in front of any base fill without re-tinting.
 *
 * **Gated on both spellings of disabled, and it has to be.** `not-disabled:`
 * alone compiles to `:not(:disabled)`, which an element carrying only
 * `data-disabled` still matches — and that is the pattern a control uses when
 * it must stay focusable to explain itself. A `Tooltip` suppresses itself over
 * a natively `disabled` reference (`use-tooltip-state`'s `isReferenceDisabled`
 * matches `:disabled` on the trigger or any descendant), so a button whose
 * whole job is to say *why* it cannot be pressed sets `aria-disabled` plus
 * `data-disabled` instead. `MenuItem` and the loading-anchor branch do the
 * same. Without the second guard those controls looked pressable on hover
 * while refusing the press — which is the one thing a disabled control must
 * not do.
 *
 * Layer: kiso · Concern: hover wash
 */

import { shades } from '../../../core/recipe'

export const hover = shades({
	zinc: 'not-disabled:not-data-disabled:hover:bg-zinc-500/15',
	red: 'not-disabled:not-data-disabled:hover:bg-red-500/15',
	amber: 'not-disabled:not-data-disabled:hover:bg-amber-500/15',
	green: 'not-disabled:not-data-disabled:hover:bg-green-500/15',
	blue: 'not-disabled:not-data-disabled:hover:bg-blue-500/15',
})
