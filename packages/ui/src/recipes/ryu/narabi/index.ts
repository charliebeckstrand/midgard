/**
 * Narabi (並び) — Arrangement.
 *
 * Ordering, positioning, and slot relationships between siblings.
 *
 * Tier: 2 · Concern: layout
 */

import { field } from './field'
import { description, item } from './item'
import { panel } from './panel'
import { slide } from './slide'
import { group, toggle } from './toggle'

export const narabi = {
	field,
	slide,
	toggle,
	group,
	item,
	description,
	panel,
} as const
