import { cva, type VariantProps } from 'class-variance-authority'
import { katachi, nuri } from '../../recipes'

type BadgeColor = keyof typeof nuri.badgeSolid

const solidCompoundVariants = (
	Object.entries(nuri.badgeSolid) as [BadgeColor, (typeof nuri.badgeSolid)[BadgeColor]][]
).map(([color, classes]) => ({
	variant: 'solid' as const,
	color,
	className: classes,
}))

const softCompoundVariants = (
	Object.entries(nuri.badgeSoft) as [BadgeColor, (typeof nuri.badgeSoft)[BadgeColor]][]
).map(([color, classes]) => ({
	variant: 'soft' as const,
	color,
	className: classes,
}))

export const badgeVariants = cva(
	[
		'inline-flex items-center gap-x-1.5 font-medium',
		katachi.maru,
		katachi.icon,
	],
	{
		variants: {
			variant: {
				solid: '',
				soft: '',
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
				sm: 'px-1 py-0.5 text-xs/4',
				md: 'px-1.5 py-0.5 text-xs/5',
				lg: 'px-2 py-1 text-sm/5',
			},
		},
		compoundVariants: [...solidCompoundVariants, ...softCompoundVariants],
		defaultVariants: {
			variant: 'soft',
			color: 'zinc',
			size: 'md',
		},
	},
)

export type BadgeVariants = VariantProps<typeof badgeVariants>
