/**
 * Shaku mark: the inline mark of `<code>` and `<kbd>`. The text and the
 * padding are ramps, so a mark takes the step of its nearest density scope.
 *
 * The fill is the ink of the mark at 15%, so the fill lowers the contrast of
 * that ink. Muted and intent text clear 4.5:1 on the page by a small margin
 * only, and on the fill they fall below 4.5:1 (WCAG 1.4.3). Thus the mark has
 * the default text color, and does not take the color of the text around it.
 * A solid fill has its own ink, and a mark on it keeps that ink (`iro.palette`).
 *
 * `w-fit` holds a mark at the width of its text. A flex or grid parent
 * stretches its items across the cross axis. Without `w-fit`, a mark that is a
 * flex or grid item fills the parent. In a line of text, the width has no effect.
 *
 * Layer: kiso · Concern: inline mark
 */

import { dan } from '../dan'
import { iro } from '../iro'
import { kasane } from '../kasane'

const { rounded } = kasane

export const mark = {
	base: ['font-mono', 'w-fit', ...iro.text.default, 'bg-current/15', rounded.md],
	density: [dan.text.small, dan.space.mark.x, dan.space.mark.y],
} as const
