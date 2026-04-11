import { maru } from '../maru'
import { compact } from './density'

export const chip = {
	base: maru.roundedFull,
	size: {
		sm: [compact.sm, 'w-16'],
		md: [compact.md, 'w-20'],
		lg: [compact.lg, 'w-24'],
	},
	defaults: { size: 'md' as const },
}
