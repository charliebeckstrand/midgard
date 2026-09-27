/**
 * Kokkaku skeleton: heading. Height tracks the resolved type-scale rung
 * (the level's natural size shifted by the density step), matching the real
 * heading at every density. With an explicit `size`, `scale` gives the height of
 * the rung. With no `size`, `ramp` gives the height of each level in a stepped
 * `density-h` class, so the silhouette takes the step of its nearest scope, as
 * the heading does. Width caps at `sm:max-w-sm`, placing multi-line skeletons
 * below rather than alongside.
 *
 * Layer: kiso · Concern: skeleton form · Unit: heading
 */

export const heading = {
	base: 'sm:max-w-sm',
	scale: {
		xs: 'h-2',
		sm: 'h-3',
		md: 'h-4',
		lg: 'h-5',
		xl: 'h-6',
		'2xl': 'h-7',
		'3xl': 'h-8',
		'4xl': 'h-9',
	},
	ramp: {
		1: 'density-h-[7,8,9]',
		2: 'density-h-[6,7,8]',
		3: 'density-h-[5,6,7]',
		4: 'density-h-[4,5,6]',
		5: 'density-h-[3,4,5]',
		6: 'density-h-[2,3,4]',
	},
}
