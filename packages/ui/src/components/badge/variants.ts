import { cva, type VariantProps } from 'class-variance-authority'
import { compoundColorVariants } from '../../core'
import { katachi, nuri } from '../../recipes'

export const badgeVariants = cva(
	['group inline-flex items-center gap-x-1.5 font-medium', katachi.icon],
	{
		variants: {
			variant: {
				solid: 'rounded-md',
				soft: 'rounded-md',
			},
			color: {
				red: '',
				amber: '',
				green: '',
				blue: '',
				teal: '',
				zinc: '',
				white: '',
				dark: '',
			},
			size: {
				sm: 'px-1.5 py-0.5 text-xs/4 *:data-[slot=icon]:size-3',
				md: 'px-2 py-0.5 text-xs/5 *:data-[slot=icon]:size-3.5',
				lg: 'px-2.5 py-1 text-sm/5 *:data-[slot=icon]:size-4',
			},
		},
		compoundVariants: [
			...compoundColorVariants(nuri.badgeSolid, 'solid'),
			...compoundColorVariants(nuri.badgeSoft, 'soft'),
		],
		defaultVariants: {
			variant: 'soft',
			color: 'zinc',
			size: 'md',
		},
	},
)

export type BadgeVariants = VariantProps<typeof badgeVariants>
