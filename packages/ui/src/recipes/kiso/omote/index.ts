/**
 * Omote (面): surfaces. `bg` carries the raw fills (`bg.surface`,
 * `bg.tint`, `bg.popover`, `bg.skeleton`); the other keys carry the
 * composed chromes that wrap a fill with ring / blur / pulse / etc.
 * One file per concern; this barrel assembles the named bundle that
 * every kata reads.
 */

import { backdrop } from './backdrop'
import { bg } from './bg'
import { blur } from './blur'
import { content } from './content'
import { fade } from './fade'
import { glass } from './glass'
import { grayscale } from './grayscale'
import { popover } from './popover'
import { rail } from './rail'
import { skeleton, skeletonShape } from './skeleton'

export const omote = {
	bg,
	popover,
	glass,
	backdrop,
	content,
	skeleton,
	skeletonShape,
	blur,
	grayscale,
	fade,
	rail,
} as const
