/**
 * Kokkaku skeleton: calendar. The silhouette has the structure of the real
 * month grid, so it has the height of the real calendar at each width step.
 *
 * `row` is the height of the header row: the height of a button, because the
 * row holds buttons. `day` is the height of each day row: the height of a
 * button, and on a coarse pointer the side of a cell (40, 44, or 48 px). The
 * width of the silhouette is the width of the calendar root, which the kata
 * gives.
 * The square weekday row comes from the `weekday` slot of the kata. Each
 * measure is a stepped `density-*` class, so the silhouette takes the step of
 * its nearest density scope, as the calendar does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: calendar
 */

import { dan } from '../dan'

export const calendar = {
	row: dan.size.calendar.row,
	/** The height of a day row: a button, and on a coarse pointer the side of a cell. */
	day: [dan.size.calendar.row, dan.size.calendar.cell],
} as const
