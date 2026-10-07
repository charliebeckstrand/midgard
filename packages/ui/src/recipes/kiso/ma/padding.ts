/**
 * Ma padding: padding utility maps keyed by the spacing label set. `p` is
 * the all-sides shorthand; `px` and `py` are the axis variants. Each stop but
 * `0` is a ramp of `dan.space.scale`, so the padding takes the step of the
 * nearest density scope.
 *
 * Layer: kiso · Concern: padding utilities
 */

import { dan } from '../dan'
import type { Ma } from './scale'

const { scale } = dan.space

export const p = {
	0: 'p-0',
	...scale.p,
} as const satisfies Record<Ma, string>

export const px = {
	0: 'px-0',
	...scale.px,
} as const satisfies Record<Ma, string>

export const py = {
	0: 'py-0',
	...scale.py,
} as const satisfies Record<Ma, string>
