/**
 * Kokkaku skeleton: calendar. The silhouette has the structure of the real
 * month grid, so it has the height of the real calendar at each width step.
 *
 * `width` is the width of the real calendar. The Calendar kata reads it.
 * `row` is the height of the header row and of each day row: the height of a
 * button, because each of those rows holds buttons. The calendar has no `xs`
 * step, so in an `xs` scope it uses `sm`. The `row` ramp has three values, so
 * it also gives the `sm` height at `xs`. The square weekday row comes from the
 * `weekday` slot of the kata. Each measure is a stepped `density-*` class, so
 * the silhouette takes the step of its nearest density scope, as the calendar
 * does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: calendar
 */

import { dan } from '../dan'

const width = dan.size.calendar.width

export const calendar = {
	width,
	row: dan.size.control.base,
} as const
