import { maru } from '../maru'
import { control } from './density'

export const input = {
	base: ['w-full', maru.rounded],
	size: {
		sm: control.sm,
		md: control.md,
		lg: control.lg,
	},
	defaults: { size: 'md' as const },
}
