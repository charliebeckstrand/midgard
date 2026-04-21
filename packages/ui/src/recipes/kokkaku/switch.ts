import { maru } from '../maru'

export const switchRecipe = {
	base: maru.roundedFull,
	size: {
		sm: ['h-5', 'w-8'],
		md: ['h-6', 'w-10'],
		lg: ['h-7', 'w-12'],
	},
	defaults: { size: 'md' as const },
}
