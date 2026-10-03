/**
 * Kokkaku skeleton: text. A single line, capped at `sm:max-w-sm`;
 * multi-line content wraps below rather than alongside.
 *
 * `base` is the 6-unit line of `md` text, for a skeleton with a fixed line,
 * such as ShinyText. `line` holds the line height of each step of the text
 * ramp, so the Text skeleton takes the step of its nearest density scope, and
 * a sized skeleton matches the text it stands in for.
 *
 * Layer: kiso · Concern: skeleton form · Unit: text
 */

import { dan } from '../dan'

export const text = {
	base: 'h-6 sm:max-w-sm',
	line: ['sm:max-w-sm', dan.size.lineText],
} as const
