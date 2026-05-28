/**
 * Panel archetype — slot layout. Shared by dialog, sheet, and drawer.
 *
 * Slot gaps come from `gap-4` on `base`, not per-slot `mt-*` — so slots
 * compose in any order without each one paying for its own first-child
 * reset. `gap` (vs `space-y`) survives `display: contents` wrappers like
 * Form/Fieldset, keeping the flex-shrink chain to the body's overflow
 * intact when one wraps content. `header` is the optional tight-gap
 * wrapper for title + description (the only pair where 4 feels loose);
 * everything else stands on its own at 4.
 *
 * Layer: kiso · Archetype: panel · Concern: layout
 */

import { iro } from '../iro'
import { ji } from '../ji'

export const layout = {
	base: 'flex flex-col gap-4',
	/** Optional wrapper around title + description for the tighter 2-unit gap; sits outside the body's overflow container. */
	header: 'flex flex-col space-y-2',
	title: [...iro.text.default, ji.lg, 'font-semibold leading-none'],
	description: [...iro.text.muted, ji.md, 'leading-tight'],
	/** Optional wrapper around body + footer — lets a Form (or other) wrap both without breaking the panel's slot rhythm. */
	content: 'flex flex-col min-h-0 space-y-4',
	body: [...iro.text.muted, 'min-h-0', 'overflow-y-auto'],
	footer: ['flex items-center justify-end gap-2'],
}
