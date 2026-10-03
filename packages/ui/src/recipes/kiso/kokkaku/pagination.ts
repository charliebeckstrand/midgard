/**
 * Kokkaku skeleton: pagination. One page-button square (`min-w-9` plus
 * `p-2` chrome resolves to 9 units); button count comes from the
 * composing skeleton.
 *
 * `nav` is the square of the Previous and Next buttons. They are icon-only
 * buttons, so their side is the height of a button at each density step, and
 * a row that holds them is that tall.
 *
 * Layer: kiso · Concern: skeleton form · Unit: pagination
 */

import { dan } from '../dan'
import { kasane } from '../kasane'

const { rounded } = kasane

export const pagination = {
	item: [rounded.lg, 'size-9'],
	nav: [rounded.lg, dan.size.pagination],
} as const
