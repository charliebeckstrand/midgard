/**
 * Popover bridge: floating-overlay archetype shared by `popover`,
 * `combobox`, `listbox`, and `date-picker`. A pure bridge: it receives the
 * `popover` token bundle and returns the trigger / portal / text / panel
 * bundle the consumers read, referencing kiso in neither value nor type.
 *
 * Popover has no variant axis: the bundle is class fragments, not a
 * `defineRecipe(...)` callable. The bridge is generic over the bundle and
 * annotates its return with the token field types; the panel slot's
 * concrete shape (including its motion config) flows through to consumers
 * without the bridge redeclaring it. `text` defaults to the
 * bundle's own `text`, the only fragment a kata overrides today.
 */

import type { ClassValue } from 'clsx'

/** The slice of the `popover` token bundle the bridge reads. `panel` is
 *  opaque to the bridge; it passes through untouched and its concrete type
 *  rides through the generic rather than being redeclared here. */
type PopoverTokens = {
	trigger: ClassValue
	portal: ClassValue
	text: ClassValue
	panel: unknown
}

type PopoverConfig = {
	/** Text fragment applied inside the panel. Defaults to the bundle's `text`. */
	text?: ClassValue
}

/**
 * Build the kata `k` surface for a popover from its token bundle.
 *
 *   - `trigger`: anchor element class
 *   - `portal`: z-stacked portal container
 *   - `text`: body text colour (caller override or bundle default)
 *   - `panel`: slot bundle (base, surface, glass, ring, motion)
 */
export function popover<T extends PopoverTokens>(
	t: T,
	config: PopoverConfig = {},
): { trigger: T['trigger']; portal: T['portal']; text: ClassValue; panel: T['panel'] } {
	return {
		trigger: t.trigger,
		portal: t.portal,
		text: config.text ?? t.text,
		panel: t.panel,
	}
}
