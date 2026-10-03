/**
 * Narabi (並び): arrangement. Ordering, positioning, and slot
 * relationships between siblings. One file per concern; this barrel
 * assembles the named bundle that every kata reads.
 */

import { description } from './description'
import { field } from './field'
import { flex } from './flex'
import { group } from './group'
import { inset } from './inset'
import { item } from './item'
import { revealed } from './revealed'
import { slide } from './slide'
import { text } from './text'
import { toggle } from './toggle'

export const narabi = {
	field,
	slide,
	toggle,
	revealed,
	group,
	item,
	inset,
	description,
	text,
	flex,
} as const
