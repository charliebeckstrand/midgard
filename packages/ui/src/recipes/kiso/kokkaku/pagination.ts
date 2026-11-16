/**
 * Kokkaku skeleton: pagination. One page-button square of 9 units: the line
 * of the `sm` text (5 units) and the `p-2` chrome (4 units). The composing
 * skeleton gives the number of buttons.
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
	nav: [dan.radius.button, dan.size.pagination],
} as const
