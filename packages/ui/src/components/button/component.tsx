'use client'

import { motion } from 'motion/react'
import { Children, isValidElement, type PointerEvent } from 'react'
import { cn, Link } from '../../core'
import { type PolymorphicProps, TouchTarget, useRipple, useTap } from '../../primitives'
import { useAlertContext } from '../alert/context'
import { Spinner } from '../spinner'
import { ButtonSizeProvider } from './context'
import {
	type ButtonVariants,
	buttonVariants,
	iconOnlySize,
	withIconEndSize,
	withIconStartSize,
} from './variants'

/** Which sides of an icon + text button hold an icon */
function iconSides(children: React.ReactNode): { start: boolean; end: boolean } {
	const arr = Children.toArray(children)

	if (arr.length < 2) return { start: false, end: false }

	return {
		start: isValidElement(arr[0]),
		end: isValidElement(arr[arr.length - 1]),
	}
}

/** A single React element child (not text) — treat as icon-only */
function isIconOnly(children: React.ReactNode): boolean {
	const arr = Children.toArray(children)

	return arr.length === 1 && isValidElement(arr[0])
}

/** Replace a leading icon with a Spinner, or prepend one if none exists */
function withLoadingSpinner(children: React.ReactNode): React.ReactNode {
	const arr = Children.toArray(children)

	const spinner = <Spinner key="loading-spinner" />

	if (arr.length > 0 && isValidElement(arr[0])) {
		return [spinner, ...arr.slice(1)]
	}

	return [spinner, ...arr]
}

type ButtonBaseProps = ButtonVariants & {
	className?: string
	ripple?: boolean
	spring?: boolean
	loading?: boolean
}

export type ButtonProps = ButtonBaseProps & PolymorphicProps<'button'>

export function Button({
	variant,
	color,
	size,
	className,
	children,
	href,
	ripple = false,
	spring = true,
	loading = false,
	...props
}: ButtonProps) {
	const alert = useAlertContext()

	if (!color && alert) {
		color = alert.variant === 'solid' ? 'inherit' : alert.color
	}

	const renderedChildren = loading ? withLoadingSpinner(children) : children

	const iconOnly = isIconOnly(renderedChildren)
	const sides = iconOnly ? { start: false, end: false } : iconSides(renderedChildren)

	const { onPointerDown: handleRipple, element: rippleElement } = useRipple()

	const classes = cn(
		buttonVariants({ variant, color, size }),
		iconOnly && iconOnlySize({ size }),
		sides.start && !sides.end && withIconStartSize({ size }),
		sides.end && !sides.start && withIconEndSize({ size }),
		className,
	)

	const pointerDown = (e: PointerEvent<HTMLElement>) => {
		if (ripple) handleRipple(e)

		const consumerHandler = (props as { onPointerDown?: (e: PointerEvent<HTMLElement>) => void })
			.onPointerDown

		consumerHandler?.(e)
	}

	const tap = useTap(spring)

	if (href !== undefined) {
		return (
			<motion.span {...tap} className="inline-flex">
				<Link
					data-slot="button"
					href={href}
					className={classes}
					{...(props as Omit<React.ComponentPropsWithoutRef<typeof Link>, 'href' | 'className'>)}
					{...(loading && { 'aria-disabled': true, 'data-disabled': '', 'aria-busy': true })}
					onPointerDown={pointerDown}
				>
					{ripple && rippleElement}
					<TouchTarget>
						<ButtonSizeProvider value={size ?? 'md'}>{renderedChildren}</ButtonSizeProvider>
					</TouchTarget>
				</Link>
			</motion.span>
		)
	}

	const buttonProps = props as Omit<
		React.ComponentPropsWithoutRef<'button'>,
		'className' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
	>

	return (
		<motion.button
			{...tap}
			data-slot="button"
			type="button"
			className={classes}
			{...buttonProps}
			disabled={loading || buttonProps.disabled}
			aria-busy={loading || undefined}
			onPointerDown={pointerDown}
		>
			{ripple && rippleElement}
			<TouchTarget>
				<ButtonSizeProvider value={size ?? 'md'}>{renderedChildren}</ButtonSizeProvider>
			</TouchTarget>
		</motion.button>
	)
}
