/**
 * Hannou active: mode-neutral background wash on the keyboard-roved item
 * (`data-active`), the counterpart to `tint`'s hover/focus wash at the same
 * 5% intensity. Consumed by the listbox katas whose roving cursor marks the
 * active row with `data-active` (`kata/option`, `kata/command-palette`).
 *
 * Layer: kiso · Concern: active (roved) tint
 */

import { mode } from '../../../core/recipe'

export const active = mode('data-active:bg-zinc-950/5', 'dark:data-active:bg-white/5')
