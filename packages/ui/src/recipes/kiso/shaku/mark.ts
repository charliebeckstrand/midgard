/**
 * Shaku mark: inline-mark dimensions for `<code>` and `<kbd>`. The text and the
 * padding are ramps, so a mark takes the step of its nearest density scope.
 *
 * `w-fit` holds a mark at the width of its text. A flex or grid parent
 * stretches its items across the cross axis. Without `w-fit`, a mark that is a
 * flex or grid item fills the parent. In a line of text, the width has no effect.
 *
 * Layer: kiso · Concern: inline-mark dimension
 */

import { dan } from '../dan'
import { ji } from '../ji'
import { kasane } from '../kasane'

const { family } = ji
const { rounded } = kasane

export const mark = {
	base: [family.mono, 'w-fit', 'bg-current/15', rounded.md],
	density: [dan.text.small, dan.space.mark.x, dan.space.mark.y],
} as const
