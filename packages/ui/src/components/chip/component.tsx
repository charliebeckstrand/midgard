import { cn, Link } from '../../core'
import type { PolymorphicProps } from '../../primitives'
import { maru } from '../../recipes'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { type ChipVariants, chipVariants } from './variants'

type ChipBaseProps = ChipVariants & {
	className?: string
}

export type ChipProps = ChipBaseProps & PolymorphicProps<'span'>

const skeletonSize = { sm: 'h-5 w-16', md: 'h-6 w-20', lg: 'h-7 w-24' } as const

export function Chip({
	variant,
	color,
	active,
	size,
	className,
	children,
	href,
	...props
}: ChipProps) {
	if (useSkeleton()) {
		return <Placeholder className={cn(skeletonSize[size ?? 'md'], maru.roundedFull, className)} />
	}

	const classes = cn(chipVariants({ variant, color, active, size }), className)

	if (href !== undefined) {
		return (
			<Link data-slot="chip" href={href} className={classes} {...props}>
				{children}
			</Link>
		)
	}

	return (
		<span data-slot="chip" className={classes} {...props}>
			{children}
		</span>
	)
}
