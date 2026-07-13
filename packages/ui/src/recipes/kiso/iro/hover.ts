/**
 * Iro hover: low-alpha hover wash shared by soft / outline / plain
 * palette variants. Each tint is the role at 15% opacity; the wash
 * sits in front of any base fill without re-tinting.
 *
 * Layer: kiso · Concern: hover wash
 */

import { shades } from '../../../core/recipe'

export const hover = shades({
	neutral: 'not-disabled:hover:bg-neutral-500/15',
	danger: 'not-disabled:hover:bg-danger-500/15',
	warning: 'not-disabled:hover:bg-warning-500/15',
	success: 'not-disabled:hover:bg-success-500/15',
	primary: 'not-disabled:hover:bg-primary-500/15',
})
