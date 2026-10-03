/**
 * Narabi inset: the outer margin of a prefix or a suffix slot in a nav row.
 * The margin moves the slot in from the edge of the row by the padding of the
 * item, so a control does not touch the chrome of the row.
 *
 * The slot is a density scope one step below the item, and its margin takes
 * that step. Each list thus gives the value for an item one step above: the
 * `xs` value is for an `sm` item. Nav and Sidebar read it.
 *
 * Layer: kiso · Concern: slot inset of a nav row
 */

import { dan } from '../dan'

export const inset = {
	prefix: dan.space.slotStart,
	suffix: dan.space.slotEnd,
} as const
