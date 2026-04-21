import { maru } from '../maru'

export const badge = {
	base: maru.rounded.md,
	size: {
		xs: ['h-4', 'w-10'],
		sm: ['h-5', 'w-12'],
		md: ['h-6', 'w-14'],
		lg: ['h-7', 'w-16'],
	},
	defaults: { size: 'md' as const },
}
