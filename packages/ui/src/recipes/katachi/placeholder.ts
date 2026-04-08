import { maru } from '../maru'
import { omote } from '../omote'

export const placeholder = {
	base: omote.skeleton,
	variant: {
		line: 'h-4 w-full rounded',
		circle: maru.roundedFull,
		rect: ['w-full', maru.rounded],
	},
	defaults: { variant: 'line' as const },
}
