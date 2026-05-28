/**
 * Narabi (並び) — arrangement. Ordering, positioning, and slot
 * relationships between siblings. One file per concern; this barrel
 * assembles the named bundle that every kata reads.
 */

import { description } from './description'
import { field, group } from './field'
import { col, fill, inlineRow, row } from './flex'
import { item } from './item'
import { slide } from './slide'
import { toggle } from './toggle'

export const narabi = {
	field,
	slide,
	toggle,
	group,
	item,
	description,
	row,
	inlineRow,
	col,
	fill,
} as const
