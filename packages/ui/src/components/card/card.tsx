import { cn } from '../../core'
import { Box, type BoxProps } from '../box'

export type CardProps = BoxProps

export function Card({
	p,
	px,
	py,
	bg = 'tint',
	outline = true,
	radius = 'lg',
	className,
	...props
}: CardProps) {
	const noExplicitPadding = p === undefined && px === undefined && py === undefined

	return (
		<Box
			dataSlot="card"
			p={p}
			px={px}
			py={py}
			bg={bg}
			outline={outline}
			radius={radius}
			className={cn(
				'overflow-hidden outline-offset-[-1px]',
				noExplicitPadding && '[&:not(:has(>[data-slot^=card-]))]:p-4',
				className,
			)}
			{...props}
		/>
	)
}
