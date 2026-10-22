/**
 * Ma padding: padding utility maps keyed by the spacing label set. `p` is
 * the all-sides shorthand; `px` and `py` are the axis variants. Each stop but
 * `0` is a ramp of `dan.space.scale`, so the padding takes the step of the
 * nearest density scope. The `0` stop is `dan.space.none`, a stepped rule
 * with no padding, so each stop is in the `density` layer, as the gap stops
 * are.
 *
 * Layer: kiso · Concern: padding utilities
 */

import { dan } from '../dan'
import type { Ma } from './scale'

const { none, scale } = dan.space

export const p = {
	0: none.p,
	...scale.p,
} as const satisfies Record<Ma, string>

export const px = {
	0: none.px,
	...scale.px,
} as const satisfies Record<Ma, string>

export const py = {
	0: none.py,
	...scale.py,
} as const satisfies Record<Ma, string>
