import { kage } from '../kage'
import { maru } from '../maru'
import { omote } from '../omote'

export const navbar = {
	base: ['flex items-center gap-3 overflow-x-auto px-4 py-2.5', 'border', maru.rounded],
	variant: {
		solid: ['bg-zinc-200 dark:bg-zinc-800', kage.borderTransparent],
		soft: [omote.tint, kage.borderTransparent],
		outline: [kage.borderColor],
		plain: [kage.borderTransparent],
	},
	defaults: { variant: 'outline' as const },
}
