import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.avatar

export const avatarVariants = cva(k.base, {
	variants: { size: k.size },
	defaultVariants: k.defaults,
})

export type AvatarVariants = VariantProps<typeof avatarVariants>

export const avatarInitialsVariants = cva(k.initials)

export const avatarImageVariants = cva(k.image)

export const avatarButtonVariants = cva(k.button)
