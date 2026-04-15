import { cn } from '../../core'
import { Link } from '../../primitives/link'
import type { PolymorphicProps } from '../../primitives'
import { kokkaku } from '../../recipes'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { type ChipVariants, chipVariants } from './variants'

type ChipBaseProps = ChipVariants & {
	className?: string
}

export type ChipProps = ChipBaseProps & PolymorphicProps<'span'>

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
		return (
			<Placeholder className={cn(kokkaku.chip.base, kokkaku.chip.size[size ?? 'md'], className)} />
		)
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
