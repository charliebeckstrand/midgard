'use client'

import { type HTMLMotionProps, motion } from 'motion/react'
import { Children, isValidElement } from 'react'
import { cn, Link } from '../../core'
import { type PolymorphicProps, TouchTarget } from '../../primitives'
import { ugoki } from '../../recipes'
import { type ButtonVariants, buttonVariants, iconOnlySize } from './variants'

const MotionLink = motion.create(Link)

const whileTap = { scale: 0.99 }

/** A single React element child (not text) — treat as icon-only */
function isIconOnly(children: React.ReactNode): boolean {
	const arr = Children.toArray(children)
	return arr.length === 1 && isValidElement(arr[0])
}

type ButtonBaseProps = ButtonVariants & {
	className?: string
}

export type ButtonProps = ButtonBaseProps & PolymorphicProps<'button'>

export function Button({ variant, color, size, className, children, href, ...props }: ButtonProps) {
	const iconOnly = isIconOnly(children)
	const classes = cn(
		buttonVariants({ variant, color, size }),
		iconOnly && iconOnlySize({ size }),
		className,
	)

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
