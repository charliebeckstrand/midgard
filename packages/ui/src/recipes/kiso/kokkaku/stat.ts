/**
 * Kokkaku skeleton: stat. One silhouette per Stat slot. Each height matches the
 * line height of the live slot. The widths are defaults, and `className` can
 * change them.
 *
 * The value follows the size axis of `StatValue`. The label, the description,
 * and the delta have one fixed silhouette each. Stat does not follow density,
 * so no silhouette here is stepped.
 *
 * Layer: kiso · Concern: skeleton form · Unit: stat
 */

export const stat = {
	value: {
		base: [],
		size: {
			sm: 'h-8 w-16',
			md: 'h-9 w-20',
			lg: 'h-10 w-24',
		},
	},
	label: { base: 'h-5 w-24' },
	description: { base: 'h-5 w-20' },
	delta: { base: 'h-5 w-12' },
} as const
