import { kage } from '../kage'

export const grid = {
	divider: {
		base: 'border-0 border-t col-span-full',
		soft: {
			true: kage.borderSubtle,
			false: kage.border,
		},
		defaults: { soft: false as const },
	},
}
