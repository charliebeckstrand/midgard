/**
 * Popover bridge — floating-overlay archetype shared by `popover`,
 * `combobox`, `listbox`, and `date-picker`. A pure bridge: it receives the
 * `popover` token bundle and returns the trigger / portal / text / panel
 * bundle the consumers read, importing nothing from kiso.
 *
 * Popover has no variant axis — the bundle is class fragments, not a
 * `defineRecipe(...)` callable. The bridge assembles the bundle and lets
 * the kata override the `text` fragment, the only fragment that varies
 * across consumers today; it defaults to the bundle's own `text`.
 */

import type { ClassValue } from 'clsx'
import type { Popover } from '../kiso/popover'

type PopoverConfig = {
	/** Text fragment applied inside the panel. Defaults to the bundle's `text`. */
	text?: ClassValue
}

/**
 * Build the kata `k` surface for a popover from its token bundle.
 *
 *   - `trigger` — anchor element class
 *   - `portal` — z-stacked portal container
 *   - `text` — body text colour (caller override or bundle default)
 *   - `panel` — slot bundle (base, surface, glass, ring, motion)
 */
export function popover(t: Popover, config: PopoverConfig = {}) {
	return {
		trigger: t.trigger,
		portal: t.portal,
		text: config.text ?? t.text,
		panel: t.panel,
	}
}
