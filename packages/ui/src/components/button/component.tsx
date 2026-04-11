'use client'

import { motion } from 'motion/react'
import { Children, isValidElement, type PointerEvent } from 'react'
import { cn, Link } from '../../core'
import { type PolymorphicProps, TouchTarget, useRipple, useTap } from '../../primitives'
import { useAlertContext } from '../alert/context'
import { useInputSize } from '../input/context'
import { Kbd } from '../kbd'
import { Spinner } from '../spinner'
import { ButtonSizeProvider } from './context'
import {
	type ButtonVariants,
	buttonVariants,
	iconOnlySize,
	withIconEndSize,
	withIconStartSize,
	withKbdEndSize,
	withKbdStartSize,
} from './variants'

/** True for anything the button should treat as an icon — i.e., any element that isn't a <Kbd>. */
function isIconLike(node: React.ReactNode): boolean {
	if (!isValidElement(node)) return false

	return node.type !== Kbd
}

/** Which sides of an icon + text button hold an icon */
function iconSides(children: React.ReactNode): { start: boolean; end: boolean } {
	const arr = Children.toArray(children)

	if (arr.length < 2) return { start: false, end: false }

	return {
		start: isIconLike(arr[0]),
		end: isIconLike(arr[arr.length - 1]),
	}
}

/** True when the node is a <Kbd> child. */
function isKbd(node: React.ReactNode): boolean {
	if (!isValidElement(node)) return false

	return node.type === Kbd
}

/** Which sides of a kbd + text button hold a Kbd */
function kbdSides(children: React.ReactNode): { start: boolean; end: boolean } {
	const arr = Children.toArray(children)

	if (arr.length < 2) return { start: false, end: false }

	return {
		start: isKbd(arr[0]),
		end: isKbd(arr[arr.length - 1]),
	}
}

/** A single icon child — treat as icon-only */
function isIconOnly(children: React.ReactNode): boolean {
	const arr = Children.toArray(children)

	return arr.length === 1 && isIconLike(arr[0])
}

/** Replace a leading icon with a Spinner, or prepend one if none exists */
function withLoadingSpinner(children: React.ReactNode): React.ReactNode {
	const arr = Children.toArray(children)

	const spinner = <Spinner key="loading-spinner" />

	if (arr.length > 0 && isIconLike(arr[0])) {
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

	const inputSize = useInputSize()

	if (!color && alert) {
		color = alert.variant === 'solid' ? 'inherit' : alert.color
	}

	const resolvedSize = size ?? inputSize

	const renderedChildren = loading ? withLoadingSpinner(children) : children

	const iconOnly = isIconOnly(renderedChildren)

	const sides = iconOnly ? { start: false, end: false } : iconSides(renderedChildren)
	const kbds = iconOnly ? { start: false, end: false } : kbdSides(renderedChildren)

	const { onPointerDown: handleRipple, element: rippleElement } = useRipple()

	const classes = cn(
		buttonVariants({ variant, color, size: resolvedSize }),
		iconOnly && iconOnlySize({ size: resolvedSize }),
		sides.start && !sides.end && withIconStartSize({ size: resolvedSize }),
		sides.end && !sides.start && withIconEndSize({ size: resolvedSize }),
		kbds.start && !kbds.end && withKbdStartSize({ size: resolvedSize }),
		kbds.end && !kbds.start && withKbdEndSize({ size: resolvedSize }),
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
						<ButtonSizeProvider value={resolvedSize ?? 'md'}>{renderedChildren}</ButtonSizeProvider>
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
				<ButtonSizeProvider value={resolvedSize ?? 'md'}>{renderedChildren}</ButtonSizeProvider>
			</TouchTarget>
		</motion.button>
	)
}
