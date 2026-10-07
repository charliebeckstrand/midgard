/**
 * Omote (面): surfaces. `bg` carries the raw fills (`bg.surface`,
 * `bg.tint`, `bg.popover`, `bg.skeleton`); the other keys carry the
 * composed chromes that wrap a fill with ring / blur / pulse / etc.
 * One file per concern; this barrel assembles the named bundle that
 * every kata reads. The `blur` and `fade` fragments stay out of
 * the bundle: only the chromes in this folder compose them.
 */

import { backdrop } from './backdrop'
import { bg } from './bg'
import { checkerboard } from './checkerboard'
import { content } from './content'
import { glass } from './glass'
import { popover } from './popover'
import { rail } from './rail'
import { skeleton } from './skeleton'

export const omote = {
	bg,
	popover,
	glass,
	backdrop,
	content,
	skeleton,
	rail,
	checkerboard,
} as const
