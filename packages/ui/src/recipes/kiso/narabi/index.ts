/**
 * Narabi (並び): arrangement. Ordering, positioning, and slot
 * relationships between siblings. One file per concern; this barrel
 * assembles the named bundle that every kata reads.
 */

import { field } from './field'
import { fit } from './fit'
import { flex } from './flex'
import { item } from './item'
import { nest } from './nest'
import { offcanvas } from './offcanvas'
import { touch } from './touch'

export const narabi = {
	field,
	item,
	flex,
	/** The height fit of a capped panel: the wrapper, a column, and the scroll region. */
	fit,
	offcanvas,
	/** The geometry of a tree that indents each level under a mark column. */
	nest,
	/** The touch gaps of a container whose hosts touch. */
	touch,
} as const
