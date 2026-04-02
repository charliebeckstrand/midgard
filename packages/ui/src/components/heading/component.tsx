import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../core'
import { sumi } from '../../recipes'

export const headingVariants = cva(sumi.text, {
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

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export type HeadingProps = HeadingVariants & {
	level?: HeadingLevel
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'h1'>, 'className'>

export function Heading({ level = 1, className, ...props }: HeadingProps) {
	const Tag = `h${level}` as const

	return (
		<Tag data-slot="heading" className={cn(headingVariants({ level }), className)} {...props} />
	)
}
