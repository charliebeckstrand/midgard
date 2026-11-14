/**
 * Narabi text: the column that stacks the label of a list item over its
 * description. It takes the free width of the row, so a leading icon stays
 * beside it. The column resets the centered text of a button row, and it
 * removes the spacer of an inline description, which a column does not need.
 *
 * Layer: kiso · Concern: stacked item text
 */

import { flex } from './flex'

export const text = [flex.col, 'min-w-0', 'flex-1', 'text-start', '*:before:hidden']
