import { cva } from 'class-variance-authority'
import { nuri } from '../../recipes'

// Color keys only — actual styles applied via compoundVariants
const colorKeys = Object.fromEntries(
	Object.keys(nuri.badgeSolid).map((key) => [key, '']),
) as Record<keyof typeof nuri.badgeSolid, string>

export const badge = cva(
	'inline-flex items-center justify-center gap-x-1.5 rounded-md font-medium forced-colors:outline',
	{
		variants: {
			variant: {
				solid: '',
				subtle: '',
			},
			color: colorKeys,
			size: {
				sm: 'px-1 py-0.5 text-xs/4',
				md: 'px-1.5 py-0.5 text-sm/5 sm:text-xs/5',
				lg: 'px-2 py-1 text-sm/5',
			},
		},
		compoundVariants: [
			...Object.entries(nuri.badgeSolid).map(([color, classes]) => ({
				variant: 'solid' as const,
				color: color as keyof typeof nuri.badgeSolid,
				className: classes,
			})),
			...Object.entries(nuri.badgeSoft).map(([color, classes]) => ({
				variant: 'subtle' as const,
				color: color as keyof typeof nuri.badgeSoft,
				className: classes,
			})),
		],
		defaultVariants: {
			variant: 'solid',
			color: 'zinc',
			size: 'md',
		},
	},
)
