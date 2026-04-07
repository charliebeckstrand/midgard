import { cn, Link } from '../../core'
import type { PolymorphicProps } from '../../primitives'
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
