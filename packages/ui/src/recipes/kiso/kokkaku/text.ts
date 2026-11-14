/**
 * Kokkaku skeleton: text. A single line, capped at `sm:max-w-sm`;
 * multi-line content wraps below rather than alongside.
 *
 * `base` is one line of the text of its parent (`h-lh`), as text with no size
 * inherits its size. `line` is the line of the Text skeleton. Without a
 * `size`, it is one line of the text of its parent, because Text with no
 * `size` takes the size of its parent and not a density step. A `size` writes
 * `data-density`, and `dan.text.scoped` gives the skeleton the text of that
 * step, so `h-lh` is the line of that text.
 *
 * Layer: kiso · Concern: skeleton form · Unit: text
 */

import { dan } from '../dan'

export const text = {
	base: 'h-lh sm:max-w-sm',
	line: ['h-lh sm:max-w-sm', dan.text.scoped],
} as const
