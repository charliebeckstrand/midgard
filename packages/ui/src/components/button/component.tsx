'use client'

import { type HTMLMotionProps, motion } from 'motion/react'
import { Children, isValidElement } from 'react'
import { cn, Link } from '../../core'
import { type PolymorphicProps, TouchTarget, tapFeedback } from '../../primitives'
import { ButtonSizeProvider } from './context'
import { type ButtonVariants, buttonVariants, iconOnlySize, withIconSize } from './variants'

const MotionLink = motion.create(Link)

/** A single React element child (not text) — treat as icon-only */
function isIconOnly(children: React.ReactNode): boolean {
	const arr = Children.toArray(children)

	return arr.length === 1 && isValidElement(arr[0])
}

/** Multiple children with at least one React element — icon + text */
function hasIcon(children: React.ReactNode): boolean {
	const arr = Children.toArray(children)

	return arr.length > 1 && arr.some(isValidElement)
}

type ButtonBaseProps = ButtonVariants & {
	className?: string
	spring?: boolean
}

export type ButtonProps = ButtonBaseProps & PolymorphicProps<'button'>

export function Button({
	variant,
	color,
	size,
	className,
	children,
	href,
	spring = true,
	...props
}: ButtonProps) {
	const iconOnly = isIconOnly(children)

	const classes = cn(
		buttonVariants({ variant, color, size }),
		iconOnly && iconOnlySize({ size }),
		!iconOnly && hasIcon(children) && withIconSize({ size }),
		className,
	)

	const tap = spring ? tapFeedback : undefined

	if (href !== undefined) {
		const { onDrag, onDragEnd, onDragOver, onDragStart, ...linkProps } = props as Record<
			string,
			unknown
		>

		return (
			<MotionLink data-slot="button" href={href} className={classes} {...tap} {...linkProps}>
				<TouchTarget>
					<ButtonSizeProvider value={size ?? 'md'}>{children}</ButtonSizeProvider>
				</TouchTarget>
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
			{...tap}
			{...(buttonProps as Omit<HTMLMotionProps<'button'>, 'className'>)}
		>
			<TouchTarget>
				<ButtonSizeProvider value={size ?? 'md'}>{children}</ButtonSizeProvider>
			</TouchTarget>
		</motion.button>
	)
}
