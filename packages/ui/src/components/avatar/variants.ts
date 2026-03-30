import { cva, type VariantProps } from 'class-variance-authority'

export const avatarVariants = cva(
	'inline-grid place-items-center rounded-full overflow-hidden align-middle *:col-start-1 *:row-start-1',
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

export const avatarInitialsVariants = cva(
	'select-none font-medium text-zinc-950 dark:text-white bg-zinc-200 dark:bg-zinc-700 size-full flex items-center justify-center',
	{
		variants: {
			size: {
				xs: 'text-[0.5rem]',
				sm: 'text-xs',
				md: 'text-sm',
				lg: 'text-base',
				xl: 'text-lg',
			},
		},
		defaultVariants: {
			size: 'md',
		},
	},
)

export type AvatarVariants = VariantProps<typeof avatarVariants>
