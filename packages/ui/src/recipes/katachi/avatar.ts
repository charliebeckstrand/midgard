import { tv, type VariantProps } from 'tailwind-variants'
import { colorVariants } from '../../core/recipe'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { take } from '../take'

const { color, compoundVariants } = colorVariants({
	solid: nuri.solid,
	soft: nuri.soft,
	outline: nuri.outline,
})

export const avatar = tv({
	base: [
		'inline-grid place-items-center align-middle overflow-hidden',
		'*:col-start-1 *:row-start-1',
		maru.roundedFull,
	],
	variants: {
		variant: {
			solid: 'border border-transparent text-white',
			soft: 'border border-transparent',
			outline: 'border',
		},
		color,
		size: take.avatar,
	},
	compoundVariants,
	defaultVariants: { variant: 'solid', color: 'zinc', size: 'md' },
})

export const avatarInitials = tv({
	base: 'select-none fill-current text-[48px] font-medium uppercase',
})
export const avatarImage = tv({ base: 'size-full object-cover' })

/** Slot classes for avatar group and status ring. */
export const slots = {
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
}

export type AvatarVariants = VariantProps<typeof avatar>
