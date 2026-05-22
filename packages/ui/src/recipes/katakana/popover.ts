/**
 * Popover applicator — floating-overlay archetype shared by `popover`,
 * `combobox`, `listbox`, and `date-picker`. Returns the trigger / portal /
 * text / panel bundle the consumers read.
 *
 * Unlike `control`, the popover archetype has no variant axis — the bundle
 * is class fragments, not a `defineRecipe(...)` callable. The applicator's
 * job is to assemble the bundle and let the kata override the `text`
 * fragment (the only fragment that varies across consumers today).
 *
 * Mock note: still sources fragments from `genkei/popover` while the two
 * layers coexist. When katakana lands, the genkei content moves into this
 * file and the genkei folder dissolves.
 */

import type { ClassValue } from 'clsx'

import { popover } from '../genkei/popover'
import { iro } from '../kiso'

const { trigger, portal, panel } = popover

type PopoverInput = {
	/** Text fragment applied inside the panel. Defaults to `iro.text.default`. */
	text?: ClassValue
}

/**
 * Build the kata `k` surface for a popover.
 *
 * Returns the floating-panel bundle:
 *   - `trigger` — anchor element class
 *   - `portal` — z-stacked portal container
 *   - `text` — body text colour
 *   - `panel` — slot bundle (base, surface, glass, ring, motion)
 */
export function popover_(cfg: PopoverInput = {}) {
	return {
		trigger,
		portal,
		text: cfg.text ?? iro.text.default,
		panel,
	}
}

// Same `popover` shadowing pattern as `control_` — the genkei const and the
// applicator function share a name; rename on the way out.
export { popover_ as popover }
