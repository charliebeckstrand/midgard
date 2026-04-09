'use client'

import { motion } from 'motion/react'
import { Children, isValidElement, type PointerEvent } from 'react'
import { cn, Link } from '../../core'
import { type PolymorphicProps, TouchTarget, useRipple, useTap } from '../../primitives'
import { useAlertContext } from '../alert/context'
import { ButtonSizeProvider } from './context'
import { type ButtonVariants, buttonVariants, iconOnlySize, withIconSize } from './variants'

/** Multiple children with at least one React element — icon + text */
function hasIcon(children: React.ReactNode): boolean {
	const arr = Children.toArray(children)

	return arr.length > 1 && arr.some(isValidElement)
}

/** A single React element child (not text) — treat as icon-only */
function isIconOnly(children: React.ReactNode): boolean {
	const arr = Children.toArray(children)

	return arr.length === 1 && isValidElement(arr[0])
}

type ButtonBaseProps = ButtonVariants & {
	className?: string
	ripple?: boolean
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
	ripple = false,
	spring = true,
	...props
}: ButtonProps) {
	const alert = useAlertContext()

	if (!color && alert) {
		color = alert.variant === 'solid' ? 'inherit' : alert.color
	}

	const iconOnly = isIconOnly(children)

	const { onPointerDown: handleRipple, element: rippleElement } = useRipple()

	const classes = cn(
		buttonVariants({ variant, color, size }),
		iconOnly ? iconOnlySize({ size }) : hasIcon(children) && withIconSize({ size }),
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
					onPointerDown={pointerDown}
				>
					{ripple && rippleElement}
					<TouchTarget>
						<ButtonSizeProvider value={size ?? 'md'}>{children}</ButtonSizeProvider>
					</TouchTarget>
				</Link>
			</motion.span>
		)
	}

	return (
		<motion.button
			{...tap}
			data-slot="button"
			type="button"
			className={classes}
			{...(props as Omit<
				React.ComponentPropsWithoutRef<'button'>,
				'className' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
			>)}
			onPointerDown={pointerDown}
		>
			{ripple && rippleElement}
			<TouchTarget>
				<ButtonSizeProvider value={size ?? 'md'}>{children}</ButtonSizeProvider>
			</TouchTarget>
		</motion.button>
	)
}
