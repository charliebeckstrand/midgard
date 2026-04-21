import { maru } from '../maru'

export const chip = {
	base: maru.rounded.full,
	size: {
		xs: ['h-4', 'w-12'],
		sm: ['h-5', 'w-16'],
		md: ['h-6', 'w-20'],
		lg: ['h-7', 'w-24'],
	},
	defaults: { size: 'md' as const },
}
