/**
 * Narabi toggle: the two-column grid that holds a check/radio/switch
 * control alongside its label and description. Control sits in column 1
 * row 1, label in column 2 row 1, description in column 2 row 2, and a
 * message in column 2 of the next row.
 *
 * When disabled, the control and label adopt `cursor-not-allowed`; the
 * description is spared and keeps the text cursor, since clicking it never
 * toggles the control.
 *
 * Layer: kiso · Concern: toggle-field grid
 */

import { dan } from '../dan'

export const toggle = [
	// The first column takes the width of the control, so the gap to the label is
	// the same at each step of the box. A fixed column does not fit a box that
	// steps with the density scope.
	'group/field grid grid-cols-[auto_1fr]',
	dan.gap.x.md,
	// When the page is zoomed in, iOS holds each tap for a possible double tap
	// and shows the tap highlight while it waits. A second tap on a near row in
	// that time is a double tap, and neither tap toggles a control.
	// `touch-manipulation` on the row, gaps included, stops the wait, as on Button.
	'touch-manipulation',
	// On a coarse pointer, the label also takes the press in the empty parts of
	// the row: the space around the control, the space after the label text, and
	// half of the gap to the next row (`--touch-target-gap-y`, which the group
	// sets). Without this, iOS moves a press that misses the control and the label
	// to a clickable node near it, and it looks up and to the left first. Thus a
	// press a little above a row went to the row above. The area of the label sits
	// behind the other slots of the row, so a press on the description does not
	// toggle the control.
	//
	// A row and its share of the gaps is also at least 44 px tall on a coarse
	// pointer, the floor of `TouchTarget`. A row with only a label is shorter
	// than that, and a finger press often lands that far from its target. Thus a
	// press then went to the next row.
	'relative isolate',
	'pointer-coarse:min-h-[calc(2.75rem-var(--touch-target-gap-y,0px))]',
	'pointer-coarse:*:data-[slot=label]:after:absolute pointer-coarse:*:data-[slot=label]:after:-z-1',
	'pointer-coarse:*:data-[slot=label]:after:inset-x-0',
	'pointer-coarse:*:data-[slot=label]:after:-inset-y-[calc(var(--touch-target-gap-y,0px)/2)]',
	'*:data-[slot=control]:col-start-1 *:data-[slot=control]:row-start-1 *:data-[slot=control]:self-center',
	'*:data-[slot=label]:col-start-2 *:data-[slot=label]:row-start-1',
	// A control that is taller than the label line makes the row taller. The
	// label then centers on the control, as the control centers on the label.
	'*:data-[slot=label]:self-center',
	'*:data-[slot=description]:col-start-2 *:data-[slot=description]:row-start-2',
	// A message goes under the label and the description. Auto placement puts it in
	// the first free cell, which is the narrow control column when the control
	// spans one row.
	'*:data-[slot=message]:col-start-2',
	'has-data-[slot=description]:**:data-[slot=label]:font-medium',
	// Every slot but the description turns not-allowed when disabled; the
	// description is non-interactive, so it keeps the text cursor.
	'has-disabled:**:data-slot:not-data-[slot=description]:cursor-not-allowed',
	'has-disabled:*:data-[slot=description]:cursor-text',
]
