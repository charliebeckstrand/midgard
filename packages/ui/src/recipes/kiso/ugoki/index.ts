/**
 * Ugoki (動き): motion. CSS transition fragments live under `css`. Framer
 * Motion enter / exit configs flow through their own files, and each is
 * composed from the `base` tempo primitives (`duration`, `ease`). The `spring`
 * vocabulary and the data-viz `mark` family sit beside them. This barrel
 * assembles the named bundle that every kata reads.
 *
 * A preset that sets `transform` directly can rest at `transform: none` only
 * if the zero of its transform is the rest. Motion starts the next animation
 * from `none` at the zero of the target: `translateX(0%)` for a slide, but
 * `scale(0)` for a scale. Thus a slide (`panel`) rests at `none`
 * through `transitionEnd`, and a scale (the tooltip kata) rests at `scale(1)`.
 */

import { duration, ease, instant } from './base'
import { collapse } from './collapse'
import { css } from './css'
import { glide } from './glide'
import { mark } from './mark'
import { overlay } from './overlay'
import { panel } from './panel'
import { popover } from './popover'
import { reveal } from './reveal'
import { spring } from './spring'
import { still } from './still'

export const ugoki = {
	css,
	duration,
	ease,
	instant,
	spring,
	mark,
	reveal,
	popover,
	overlay,
	collapse,
	glide,
	panel,
	still,
} as const
