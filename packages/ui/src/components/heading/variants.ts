import { cva, type VariantProps } from 'class-variance-authority'
import { sumi } from '../../recipes'

export const headingVariants = cva(sumi.base, {
	variants: {
		level: {
			1: 'text-3xl/9 font-bold tracking-tight',
			2: 'text-2xl/8 font-semibold tracking-tight',
			3: 'text-xl/7 font-semibold tracking-tight',
			4: 'text-lg/6 font-semibold',
			5: 'text-base/6 font-medium',
			6: 'text-sm/5 font-medium',
		},
	},
	defaultVariants: {
		level: 1,
	},
})

export type HeadingVariants = VariantProps<typeof headingVariants>
