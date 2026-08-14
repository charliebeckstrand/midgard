/**
 * Which palette slot each registered overlay paints in, continuing the fixed
 * categorical order after the region categories.
 *
 * Held apart from the plat that owns the ledger because the answer has three
 * readers — the marks' own paint, the legend's swatches, and the tooltip's — and
 * because a group is one entry rather than one mark: the rule that its members
 * share a colour is the rule that makes a merged entry read as one thing, and it
 * belongs beside the ledger it reads rather than inline in the assembly.
 */

import type { MapSeriesColor } from '../../../../recipes/kata/map'
import { slotColor } from '../map-region/category'
import type { MapOverlayEntry } from './entry'

/**
 * The slot colour every registered mark paints in, keyed by mark id.
 *
 * The order advances per legend entry, not per mark: a group's first member
 * claims the slot and its siblings read that same colour back, so a zone and the
 * depot inside it can never sit under one label in two colours, and a group never
 * eats a palette slot per member. An explicit `color` still occupies its
 * position, so naming one mark's colour never shifts what its siblings take.
 *
 * @param entries - The ledger, in registration order.
 * @param offset - How many slots the region categories already hold.
 * @internal
 */
export function overlaySlotColors(
	entries: MapOverlayEntry[],
	offset: number,
): ReadonlyMap<string, MapSeriesColor> {
	const colors = new Map<string, MapSeriesColor>()

	// What each group has already claimed, so a later member reads the colour its
	// first one set rather than drawing a slot of its own.
	const claimed = new Map<string, MapSeriesColor>()

	let slot = offset

	for (const entry of entries) {
		const held = entry.group === undefined ? undefined : claimed.get(entry.group)

		if (held !== undefined) {
			colors.set(entry.id, held)

			continue
		}

		const color = entry.color ?? slotColor(slot)

		slot++

		colors.set(entry.id, color)

		if (entry.group !== undefined) claimed.set(entry.group, color)
	}

	return colors
}
