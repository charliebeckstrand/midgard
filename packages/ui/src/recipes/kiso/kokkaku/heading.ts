/**
 * Kokkaku skeleton: heading. `ramp` gives the height of each level in a stepped
 * `density-h` class that tracks the rung of `headingRamp` at each step, so the
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

export const heading = {
	base: 'sm:max-w-sm',
	inline: 'inline-block h-[1em] w-40 max-w-full align-middle',
	ramp: {
		1: 'density-h-[7,8,9]',
		2: 'density-h-[6,7,8]',
		3: 'density-h-[5,6,7]',
		4: 'density-h-[4,5,6]',
		5: 'density-h-[3,4,5]',
		6: 'density-h-[2,3,4]',
	},
}
