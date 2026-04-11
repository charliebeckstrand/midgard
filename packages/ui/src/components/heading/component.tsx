import { cn } from '../../core'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { type HeadingVariants, headingVariants } from './variants'

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export type HeadingProps = HeadingVariants & {
	level?: HeadingLevel
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'h1'>, 'className'>

const skeletonHeight = {
	1: 'h-8',
	2: 'h-7',
	3: 'h-6',
	4: 'h-5',
	5: 'h-5',
	6: 'h-4',
} as const satisfies Record<HeadingLevel, string>

export function Heading({ level = 1, className, ...props }: HeadingProps) {
	if (useSkeleton()) {
		return <Placeholder className={cn(skeletonHeight[level], 'w-1/2', className)} />
	}

	const Tag = `h${level}` as const

	return (
		<Tag data-slot="heading" className={cn(headingVariants({ level }), className)} {...props} />
	)
}
