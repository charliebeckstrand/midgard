import { maru } from '../maru'
import { compact } from './density'

export const badge = {
	base: maru.roundedMd,
	size: {
		sm: [compact.sm, 'w-12'],
		md: [compact.md, 'w-14'],
		lg: [compact.lg, 'w-16'],
	},
	defaults: { size: 'md' as const },
}
