import { maru } from '../maru'
import { nuri } from '../nuri'
import { take } from '../take'

export const avatar = {
	group: {
		base: 'flex items-center',
		ring: '*:ring-2 *:ring-white dark:*:ring-zinc-900',
		spacing: {
			xs: '-space-x-1',
			sm: '-space-x-1.5',
			md: '-space-x-2',
			lg: '-space-x-2.5',
			xl: '-space-x-3',
		},
	},
	statusRing: 'ring-2 ring-white dark:ring-zinc-900',
	base: [
		'inline-grid place-items-center overflow-hidden align-middle *:col-start-1 *:row-start-1',
		maru.roundedFull,
	],
	variant: {
		solid: {
			base: 'border border-transparent text-white',
			color: nuri.solid,
		},
		soft: {
			base: 'border border-transparent',
			color: nuri.soft,
		},
		outline: {
			base: 'border',
			color: nuri.outline,
		},
	},
	size: take.avatar,
	defaults: { variant: 'solid' as const, color: 'zinc' as const, size: 'md' as const },
	initials: 'select-none fill-current text-[48px] font-medium uppercase',
	image: 'size-full object-cover',
}
