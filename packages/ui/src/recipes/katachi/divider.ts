import { kage } from '../kage'

export const divider = {
	base: ['border-0'],
	orientation: {
		horizontal: 'w-full border-t',
		vertical: 'self-stretch border-l',
	},
	soft: {
		true: kage.borderSubtleColor,
		false: kage.borderColor,
	},
	defaults: { orientation: 'horizontal' as const, soft: false as const },
}
