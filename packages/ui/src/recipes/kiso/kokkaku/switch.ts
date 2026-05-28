/**
 * Kokkaku skeleton — switch. Pill silhouette across three switch size
 * steps. Exported as `switchRecipe` because `switch` is a reserved
 * keyword in JS; surfaced through the bundle as `switch:`.
 *
 * Layer: kiso · Concern: skeleton form · Unit: switch
 */

export const switchRecipe = {
	base: 'rounded-full',
	size: {
		sm: ['h-5', 'w-8'],
		md: ['h-6', 'w-10'],
		lg: ['h-7', 'w-12'],
	},
	defaults: { size: 'md' as const },
}
