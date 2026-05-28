/**
 * Ugoki (動き) — motion. CSS transition fragments live under `css`;
 * Framer Motion enter / exit configs flow through their own files.
 * This barrel assembles the named bundle that every kata reads.
 */

import { collapse } from './collapse'
import { css } from './css'
import { overlay } from './overlay'
import { panel } from './panel'
import { popover } from './popover'
import { reveal } from './reveal'
import { spring } from './spring'
import { toast } from './toast'
import { tooltip } from './tooltip'

export const ugoki = {
	css,
	spring,
	reveal,
	popover,
	overlay,
	toast,
	tooltip,
	collapse,
	panel,
} as const
