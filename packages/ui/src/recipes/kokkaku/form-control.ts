import { maru } from '../maru'

export const formControl = {
	base: ['w-full', maru.rounded],
	size: {
		sm: 'h-7',
		md: 'h-9',
		lg: 'h-11',
	},
	defaults: { size: 'md' as const },
}
