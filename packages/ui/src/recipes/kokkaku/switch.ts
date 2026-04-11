import { maru } from '../maru'
import { compact } from './density'

export const switchRecipe = {
	base: maru.roundedFull,
	size: {
		sm: [compact.sm, 'w-8'],
		md: [compact.md, 'w-10'],
		lg: [compact.lg, 'w-12'],
	},
	defaults: { size: 'md' as const },
}
