import { cn } from '../../core'
import { type HeadingVariants, headingVariants } from './variants'

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
