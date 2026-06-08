/**
 * Panel archetype — slot layout. Shared by dialog, sheet, and drawer.
 *
 * Slot gaps come from `gap-4` on `base`, not per-slot `mt-*`, so slots
 * compose in any order. `gap` (vs `space-y`) survives `display: contents`
 * wrappers like Form/Fieldset, keeping the flex-shrink chain to the
 * body's overflow intact. `header` is the optional tight-gap wrapper for
 * title + description; everything else stands on its own at 4.
 *
 * Layer: kiso · Archetype: panel · Concern: layout
 */

import { iro } from '../iro'
import { ji } from '../ji'

const { text } = iro
const { size, leading } = ji

export const layout = {
	base: 'flex flex-col gap-4',
	/** Optional wrapper around title + description for the tighter 2-unit gap; sits outside the body's overflow container. */
	header: 'flex flex-col space-y-2',
	/** Color and leading only; weight and font size are derived from the heading scale by the Title component. */
	title: [...text.default, leading.none],
	description: [...text.muted, size.md, leading.tight],
	/** Optional wrapper around body + footer — a Form or similar can wrap both while preserving the panel's slot rhythm. */
	content: 'flex flex-col min-h-0 space-y-4',
	body: [...text.muted, 'min-h-0 overflow-y-auto'],
	footer: ['flex items-center justify-end gap-2'],
} as const
