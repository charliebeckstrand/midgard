/**
 * Popover applicator — floating-overlay archetype shared by `popover`,
 * `combobox`, `listbox`, and `date-picker`. Returns the trigger / portal /
 * text / panel bundle the consumers read.
 *
 * Unlike `control`, the popover archetype has no variant axis — the bundle
 * is class fragments, not a `defineRecipe(...)` callable, so the applicator
 * doesn't go through `defineApplicator` / `applyRecipe`. It assembles the
 * bundle and lets the kata override the `text` fragment (the only
 * fragment that varies across consumers today).
 */

import type { ClassValue } from 'clsx'

import { popover as popoverFragments } from '../genkei/popover'
import { iro } from '../kiso'

const { trigger, portal, panel } = popoverFragments

type PopoverConfig = {
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
export function popover(config: PopoverConfig = {}) {
	return {
		trigger,
		portal,
		text: config.text ?? iro.text.default,
		panel,
	}
}
