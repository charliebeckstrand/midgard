/**
 * Shaku mark: inline-mark dimensions for `<code>` and `<kbd>`. The text and the
 * padding are ramps, so a mark takes the step of its nearest density scope.
 *
 * Layer: kiso · Concern: inline-mark dimension
 */

import { dan } from '../dan'
import { ji } from '../ji'
import { kasane } from '../kasane'

const { family } = ji
const { rounded } = kasane

export const mark = {
	base: [family.mono, 'bg-current/15', rounded.md],
	density: [dan.text.small, dan.space.markX, dan.space.markY],
} as const
