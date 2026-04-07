'use client'

import { motion } from 'motion/react'
import { cn, Link } from '../../core'
import { type PolymorphicProps, tapFeedback } from '../../primitives'
import { type ChipVariants, chipVariants } from './variants'

const MotionLink = motion.create(Link)

type ChipBaseProps = ChipVariants & {
	className?: string
	spring?: boolean
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
	spring = true,
	...props
}: ChipProps) {
	const classes = cn(chipVariants({ variant, color, active, size }), className)

	const tap = spring ? tapFeedback : undefined

	const { onDrag, onDragEnd, onDragOver, onDragStart, ...rest } = props as Record<string, unknown>

	if (href !== undefined) {
		return (
			<MotionLink data-slot="chip" href={href} className={classes} {...tap} {...rest}>
				{children}
			</MotionLink>
		)
	}

	return (
		<motion.span data-slot="chip" className={classes} {...tap} {...rest}>
			{children}
		</motion.span>
	)
}
