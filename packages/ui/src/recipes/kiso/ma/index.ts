/**
 * Ma (間): interval. The named spacing scale shared by padding and
 * gap. One file per axis family; this barrel assembles the
 * named bundle that Box, Flex (and Stack), Split, and Columns read.
 *
 * The label set lives outside `--spacing-*`; semantic labels
 * (`sm` / `md` / `lg`) are distinct from Tailwind's width/height tokens
 * (`max-w-sm`, `w-md`). `xs` and `xl` cover compact chrome and
 * page-level layout.
 */

import { gap } from './gap'
import { p, px, py } from './padding'

export type { Ma } from './scale'

export const ma = {
	p,
	px,
	py,
	gap,
} as const
