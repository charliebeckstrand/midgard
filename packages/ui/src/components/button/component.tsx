'use client'

import { type HTMLMotionProps, motion } from 'motion/react'
import { cn, Link } from '../../core'
import { type PolymorphicProps, TouchTarget } from '../../primitives'
import { ugoki } from '../../recipes'
import { type ButtonVariants, buttonVariants } from './variants'

const MotionLink = motion.create(Link)

const whileTap = { scale: 0.99 }

type ButtonBaseProps = ButtonVariants & {
	className?: string
}

export type ButtonProps = ButtonBaseProps & PolymorphicProps<'button'>

export function Button({ variant, color, size, className, children, href, ...props }: ButtonProps) {
	const classes = cn(buttonVariants({ variant, color, size }), className)

	if (href !== undefined) {
		const { onDrag, onDragEnd, onDragOver, onDragStart, ...linkProps } = props as Record<
			string,
			unknown
		>

		return (
			<MotionLink
				data-slot="button"
				href={href}
				className={classes}
				whileTap={whileTap}
				transition={ugoki.tap}
				{...linkProps}
			>
				<TouchTarget>{children}</TouchTarget>
			</MotionLink>
		)
	}

	const { onDrag, onDragEnd, onDragOver, onDragStart, ...buttonProps } = props as Record<
		string,
		unknown
	>

	return (
		<motion.button
			data-slot="button"
			type="button"
			className={classes}
			whileTap={whileTap}
			transition={ugoki.tap}
			{...(buttonProps as Omit<HTMLMotionProps<'button'>, 'className'>)}
		>
			<TouchTarget>{children}</TouchTarget>
		</motion.button>
	)
}
