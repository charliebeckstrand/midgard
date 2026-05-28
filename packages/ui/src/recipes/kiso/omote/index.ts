/**
 * Omote (面) — surfaces. `bg` carries the raw fills (`bg.surface`,
 * `bg.tint`, `bg.popover`, `bg.skeleton`, `bg.backdrop`); the other
 * keys carry the composed chromes that wrap a fill with ring / blur /
 * pulse / etc. One file per concern; this barrel assembles the named
 * bundle that every kata reads.
 */

import { backdrop } from './backdrop'
import { bg } from './bg'
import { blur } from './blur'
import { content } from './content'
import { glass } from './glass'
import { popover } from './popover'
import { skeleton } from './skeleton'

export const omote = {
	bg,
	popover,
	glass,
	backdrop,
	content,
	skeleton,
	blur,
} as const
