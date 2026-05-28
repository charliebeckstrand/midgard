/**
 * Kokkaku skeleton — button. Rounded-lg silhouette across the four
 * button size steps.
 *
 * Layer: kiso · Concern: skeleton form · Unit: button
 */

export const button = {
	base: 'rounded-lg',
	size: {
		xs: 'h-6 w-16',
		sm: 'h-7 w-20',
		md: 'h-9 w-24',
		lg: 'h-11 w-28',
	},
	defaults: { size: 'md' as const },
}
