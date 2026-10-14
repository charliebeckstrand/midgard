/**
 * Ugoki (動き): motion. CSS transition fragments live under `css`. Framer
 * Motion enter / exit configs flow through their own files. Each is composed
 * from the `base` tempo primitives (`duration`, `ease`), the `spring`
 * vocabulary, and the shared data-viz `mark` family. This barrel assembles
 * the named bundle that every kata reads.
 *
 * A preset that sets `transform` directly can rest at `transform: none` only
 * if the zero of its transform is the rest. Motion starts the next animation
 * from `none` at the zero of the target: `translateX(0%)` for a slide, but
 * `scale(0)` for a scale. Thus a slide (`panel`, `toast`) rests at `none`
 * through `transitionEnd`, and a scale (`tooltip`) rests at `scale(1)`.
 */

import { duration, ease } from './base'
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
import { toast } from './toast'
import { tooltip } from './tooltip'

export const ugoki = {
	css,
	duration,
	ease,
	spring,
	mark,
	reveal,
	popover,
	overlay,
	toast,
	tooltip,
	collapse,
	glide,
	panel,
	still,
} as const
