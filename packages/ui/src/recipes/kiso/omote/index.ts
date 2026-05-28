/**
 * Omote (面) — surfaces. Named surface fills and generic chromes that
 * apply across the design system. One file per concern; this barrel
 * assembles the named bundle that every kata reads.
 */

import { backdrop } from './backdrop'
import { blur } from './blur'
import { content } from './content'
import { glass } from './glass'
import { popover } from './popover'
import { skeleton } from './skeleton'
import { surface } from './surface'
import { tint } from './tint'

export const omote = {
	/** Solid surface background (cards, sidebars, navbars). */
	surface,
	/** Floating popover surface — translucent fill + ring + blur. */
	popover,
	/** Fully transparent glass surface — blur only. */
	glass,
	/** Backdrop fills (modal / sheet overlays). */
	backdrop,
	/** Card content block with viewport-dependent chrome. */
	content,
	/** Subtle tinted overlay — used for raised / striped rows. */
	tint,
	/** Loading skeleton background. */
	skeleton,
	/** Backdrop blur fragments. */
	blur,
} as const
