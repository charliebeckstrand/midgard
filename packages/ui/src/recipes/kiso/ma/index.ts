/**
 * Ma (間): interval. The named spacing scale shared by padding,
 * margin, and gap. One file per axis family; this barrel assembles the
 * named bundle that every kata reads.
 *
 * The label set lives outside `--spacing-*`; semantic labels
 * (`sm` / `md` / `lg`) are distinct from Tailwind's width/height tokens
 * (`max-w-sm`, `w-md`). `xs` and `xl` cover compact chrome and
 * page-level layout.
 */

import { gap } from './gap'
import { m, mx, my } from './margin'
import { p, px, py } from './padding'

export type { Ma } from './scale'

export const ma = {
	p,
	px,
	py,
	m,
	mx,
	my,
	gap,
} as const
