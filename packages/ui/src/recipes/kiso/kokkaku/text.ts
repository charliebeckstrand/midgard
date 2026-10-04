/**
 * Kokkaku skeleton: text. A single line, capped at `sm:max-w-sm`;
 * multi-line content wraps below rather than alongside.
 *
 * `base` is the 6-unit line of `md` text, the size that text inherits by
 * default. `line` is the line of the Text skeleton. Without a `size`, it is
 * the `md` line under `density-any`, because Text with no `size` takes the
 * size of its parent and not a density step. A `size` writes `data-density`,
 * and the gated ramp gives the line height of that step.
 *
 * Layer: kiso · Concern: skeleton form · Unit: text
 */

import { dan } from '../dan'

export const text = {
	base: 'h-6 sm:max-w-sm',
	line: ['sm:max-w-sm', 'density-any:h-6', dan.size.line.text],
} as const
