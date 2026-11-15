/**
 * Kokkaku skeleton: switch. A pill silhouette across the switch size
 * steps. Exported as `switchSkeleton` (`switch` is a reserved JS keyword);
 * surfaced through the bundle as `switch:`.
 *
 * The pill has the height and the width of the real track (`dan.size.row` and
 * `dan.size.switch.width`). Each is a stepped `density-*` class, so the silhouette takes the step of
 * its nearest density scope, as the switch does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: switch
 */

import { dan } from '../dan'
import { kasane } from '../kasane'

const { rounded } = kasane

export const switchSkeleton = {
	base: [rounded.full, dan.size.row, dan.size.switch.width],
	density: true,
} as const
