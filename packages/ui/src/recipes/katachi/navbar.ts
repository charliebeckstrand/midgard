import { kage } from '../kage'
import { maru } from '../maru'

export const navbar = {
	base: ['flex items-center gap-4', 'px-4 py-2.5', 'border', 'overflow-x-auto', maru.rounded],
	variant: {
		outline: [kage.borderColor],
		plain: [kage.borderTransparent],
	},
	defaults: { variant: 'outline' as const },
}
