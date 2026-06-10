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
import { m, mb, ml, mr, mt, mx, my } from './margin'
import { p, pb, pl, pr, pt, px, py } from './padding'
import { stops } from './stops'

export type { Ma } from './stops'

export const ma = {
	stops,
	p,
	px,
	py,
	pl,
	pr,
	pt,
	pb,
	m,
	mx,
	my,
	ml,
	mr,
	mt,
	mb,
	gap,
} as const
