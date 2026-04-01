import { cva, type VariantProps } from 'class-variance-authority'
import { ki, take } from '../../recipes'

export const avatarVariants = cva(
	'inline-grid place-items-center overflow-hidden rounded-full align-middle text-white *:col-start-1 *:row-start-1 bg-zinc-600 dark:bg-zinc-700',
	{
		variants: {
			size: take.avatar,
		},
		defaultVariants: {
			size: 'md',
		},
	},
)

export type AvatarVariants = VariantProps<typeof avatarVariants>

export const avatarInitialsVariants = cva(
	'select-none fill-current text-[48px] font-medium uppercase',
)

export const avatarImageVariants = cva('size-full object-cover')

export const avatarButtonVariants = cva([ki.offset, 'relative cursor-default rounded-full'])
