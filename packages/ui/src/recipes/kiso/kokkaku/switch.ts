/**
 * Kokkaku skeleton: switch. Pill silhouette across three switch size
 * steps. Exported as `switchRecipe` (`switch` is a reserved JS keyword);
 * surfaced through the bundle as `switch:`.
 *
 * `track` is the height and the width of the real track. The Switch kata reads
 * it. Each is a stepped `density-*` class, so the silhouette takes the step of
 * its nearest density scope, as the switch does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: switch
 */

import { kasane } from '../kasane'

const { rounded } = kasane

const track = ['density-h-[5,6,7]', 'density-w-[8,10,12]'] as const

export const switchRecipe = {
	base: [rounded.full, ...track],
	track,
	density: true,
} as const
