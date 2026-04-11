/**
 * Narabi (並び) — Arrangement.
 *
 * How elements line up — the ordering, positioning, and slot relationships
 * between siblings. The choreography of a layout.
 *
 * Tier: 2
 * Concern: layout
 */

import { field } from './field'
import { description, item } from './item'
import { panel } from './panel'
import { placement } from './placement'
import { position } from './position'
import { slide } from './slide'
import { group, toggle } from './toggle'

export const narabi = {
	field,
	placement,
	position,
	slide,
	toggle,
	group,
	item,
	description,
	panel,
} as const
