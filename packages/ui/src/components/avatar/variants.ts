import { cva, type VariantProps } from 'class-variance-authority'

export const avatarVariants = cva(
	'inline-grid place-items-center overflow-hidden rounded-full align-middle *:col-start-1 *:row-start-1',
	{
		variants: {
			size: {
				xs: 'size-6',
				sm: 'size-8',
				md: 'size-10',
				lg: 'size-12',
				xl: 'size-16',
			},
		},
		defaultVariants: {
			size: 'md',
		},
	},
)

export type AvatarVariants = VariantProps<typeof avatarVariants>
