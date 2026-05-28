/**
 * Kokkaku skeleton — card. Block silhouette across three card size
 * steps; rounding tracks size.
 *
 * Layer: kiso · Concern: skeleton form · Unit: card
 */

export const card = {
	base: 'w-full',
	size: {
		sm: ['h-24', 'rounded-sm'],
		md: ['h-32', 'rounded-md'],
		lg: ['h-40', 'rounded-lg'],
	},
	defaults: { size: 'md' as const },
}
