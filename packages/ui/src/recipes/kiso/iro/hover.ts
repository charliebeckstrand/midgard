/**
 * Iro hover: low-alpha hover wash shared by soft / outline / plain
 * palette variants. Each tint is the colour at 15% opacity; the wash
 * sits in front of any base fill without re-tinting.
 *
 * Layer: kiso · Concern: hover wash
 */

import { shades } from '../../../core/recipe'

export const hover = shades({
	zinc: ['not-disabled:hover:bg-zinc-600/15', 'dark:not-disabled:hover:bg-zinc-500/15'],
	red: ['not-disabled:hover:bg-red-600/15', 'dark:not-disabled:hover:bg-red-500/15'],
	amber: ['not-disabled:hover:bg-amber-500/15', 'dark:not-disabled:hover:bg-amber-500/15'],
	green: ['not-disabled:hover:bg-green-600/15', 'dark:not-disabled:hover:bg-green-500/15'],
	blue: ['not-disabled:hover:bg-blue-600/15', 'dark:not-disabled:hover:bg-blue-500/15'],
})
