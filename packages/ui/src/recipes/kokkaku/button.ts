import { maru } from '../maru'
import { control } from './density'

export const button = {
	base: maru.rounded,
	size: {
		xs: [control.xs, 'w-16'],
		sm: [control.sm, 'w-20'],
		md: [control.md, 'w-24'],
		lg: [control.lg, 'w-28'],
	},
	defaults: { size: 'md' as const },
}
