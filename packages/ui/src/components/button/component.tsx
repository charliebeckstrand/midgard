'use client'

import { motion } from 'motion/react'
import type { PointerEvent } from 'react'
import { cn, Link } from '../../core'
import { type PolymorphicProps, TouchTarget, useRipple, useTap } from '../../primitives'
import { maru } from '../../recipes'
import { useAlertContext } from '../alert/context'
import { useInputSize } from '../input/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { ButtonSizeProvider } from './context'
import { iconSides, isIconOnly, kbdSides, withLoadingSpinner } from './utilities'
import {
	type ButtonVariants,
	buttonVariants,
	iconOnlySize,
	withIconEndSize,
	withIconStartSize,
	withKbdEndSize,
	withKbdStartSize,
} from './variants'

const skeletonSize = {
	xs: 'h-6 w-16',
	sm: 'h-7 w-20',
	md: 'h-9 w-24',
	lg: 'h-11 w-28',
} as const

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
	spring = false,
	loading = false,
	...props
}: ButtonProps) {
	const alert = useAlertContext()

	const inputSize = useInputSize()
	const skeleton = useSkeleton()

	const { onPointerDown: handleRipple, element: rippleElement } = useRipple()

	const tap = useTap(spring)

	if (!color && alert) {
		color = alert.variant === 'solid' ? 'inherit' : alert.color
	}

	const resolvedSize = size ?? inputSize

	if (skeleton) {
		return (
			<Placeholder className={cn(skeletonSize[resolvedSize ?? 'md'], maru.rounded, className)} />
		)
	}

	const renderedChildren = loading ? withLoadingSpinner(children) : children

	const iconOnly = isIconOnly(renderedChildren)

	const sides = iconOnly ? { start: false, end: false } : iconSides(renderedChildren)
	const kbds = iconOnly ? { start: false, end: false } : kbdSides(renderedChildren)

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
