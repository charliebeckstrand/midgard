import { kage } from '../kage'
import { maru } from '../maru'

export const navbar = {
	base: [
		'flex items-center gap-4',
		'overflow-x-auto',
		'px-4 py-2.5',
		maru.rounded,
		'border',
	],
	variant: {
		outline: [kage.borderColor],
		plain: [kage.borderTransparent],
	},
	defaults: { variant: 'outline' as const },
}
