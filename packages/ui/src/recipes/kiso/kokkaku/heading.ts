/**
 * Kokkaku skeleton: heading. `ramp` gives the height of each level in a stepped
 * `density-h` class that tracks the rung of the heading ramp at each step, so the
 * silhouette matches the real heading at each density. The silhouette takes the
 * step of its nearest scope, as the heading does. Width caps at `sm:max-w-sm`,
 * placing multi-line skeletons below rather than alongside.
 *
 * `inline` is the form that sits inside a real heading, such as a `CardTitle`
 * whose text loads later. It is one em tall, so it takes the font size of the
 * heading around it and stays inside the line box of that heading. Thus the
 * heading keeps its settled height while the text loads.
 *
 * Layer: kiso · Concern: skeleton form · Unit: heading
 */

import { dan } from '../dan'

export const heading = {
	base: 'sm:max-w-sm',
	inline: 'inline-block h-[1em] w-40 max-w-full align-middle',
	ramp: {
		1: dan.size.line.title.large,
		2: dan.size.line.title.base,
		3: dan.size.line.title.small,
		4: dan.size.line.subtitle,
		5: dan.size.line.small,
		6: dan.size.line.tiny,
	},
} as const
