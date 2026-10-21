/**
 * Omote (面): surfaces. `bg` carries the raw fills (`bg.surface`,
 * `bg.tint`, `bg.popover`, `bg.skeleton`); the other keys carry the
 * composed chromes that wrap a fill with ring / blur / pulse / etc.
 * One file per concern; this barrel assembles the named bundle that
 * every kata reads. The `blur` fragment stays out of the bundle: only
 * the chromes in this folder compose it.
 */

import { backdrop } from './backdrop'
import { bg } from './bg'
import { checkerboard } from './checkerboard'
import { content } from './content'
import { fade } from './fade'
import { glass } from './glass'
import { panel } from './panel'
import { popover } from './popover'
import { rail } from './rail'
import { skeleton } from './skeleton'

export const omote = {
	bg,
	popover,
	glass,
	/** The surface of a panel: the chrome, the fill and the chrome, and the `surface` axis of a modal panel. */
	panel,
	backdrop,
	content,
	skeleton,
	rail,
	/** The edge fade of a scroll container, as a mask. */
	fade,
	checkerboard,
} as const
