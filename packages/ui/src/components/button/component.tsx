'use client'

import { motion } from 'motion/react'
import type { PointerEvent } from 'react'
import { cn, Link } from '../../core'
import { type PolymorphicProps, TouchTarget, useRipple, useTap } from '../../primitives'
import { kokkaku } from '../../recipes'
import { useAlertContext } from '../alert/context'
import { useGlass } from '../glass/context'
import { useInputSize } from '../input/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import type { SpinnerProps } from '../spinner'
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

export type LoadingOptions = Pick<SpinnerProps, 'color' | 'size' | 'label'>

type ButtonBaseProps = ButtonVariants & {
	ripple?: boolean
	spring?: boolean
	loading?: boolean | LoadingOptions
	className?: string
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
	loading: loadingProp = false,
	...props
}: ButtonProps) {
	const loading = !!loadingProp
	const loadingOptions = typeof loadingProp === 'object' ? loadingProp : undefined

	const alert = useAlertContext()
	const glass = useGlass()

	const inputSize = useInputSize()
	const skeleton = useSkeleton()

	const { onPointerDown: handleRipple, element: rippleElement } = useRipple()

	const tap = useTap(spring)

	const resolvedVariant = variant ?? (glass ? 'glass' : undefined)

	if (!color && alert) {
		color = alert.variant === 'solid' ? 'inherit' : alert.color
	}

	const resolvedSize = size ?? inputSize

	if (skeleton) {
		return (
			<Placeholder
				className={cn(kokkaku.button.base, kokkaku.button.size[resolvedSize ?? 'md'], className)}
			/>
		)
	}

	const renderedChildren = loading ? withLoadingSpinner(children, loadingOptions) : children

	const iconOnly = isIconOnly(renderedChildren)

	const sides = iconOnly ? { start: false, end: false } : iconSides(renderedChildren)
	const kbds = iconOnly ? { start: false, end: false } : kbdSides(renderedChildren)

	const classes = cn(
		buttonVariants({ variant: resolvedVariant, color, size: resolvedSize }),
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
