/**
 * Ugoki (動き): motion. CSS transition fragments live under `css`; Framer
 * Motion enter / exit configs flow through their own files, each composed
 * from the `base` tempo primitives (`duration`, `ease`), the `spring`
 * vocabulary, and the shared data-viz `mark` family. This barrel assembles
 * the named bundle that every kata reads.
 */

import { duration, ease } from './base'
import { collapse } from './collapse'
import { css } from './css'
import { mark } from './mark'
import { overlay } from './overlay'
import { panel } from './panel'
import { popover } from './popover'
import { reveal } from './reveal'
import { spring } from './spring'
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
	panel,
} as const
