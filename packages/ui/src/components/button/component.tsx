'use client'

import { motion } from 'motion/react'
import type { PointerEvent, ReactNode, Ref } from 'react'
import { cn } from '../../core'
import { type PolymorphicProps, TouchTarget, useRipple, useTap } from '../../primitives'
import { Link } from '../../primitives/link'
import { kokkaku } from '../../recipes'
import { useAlertContext } from '../alert/context'
import { useGlass } from '../glass/context'
import { useInputSize } from '../input/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { Spinner, type SpinnerProps } from '../spinner'
import { ButtonSizeProvider } from './context'
import { type ButtonVariants, buttonVariants } from './variants'

export type LoadingOptions = Pick<SpinnerProps, 'color' | 'size' | 'label'>

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

type ButtonBaseProps = ButtonVariants & {
	block?: boolean
	ripple?: boolean
	spring?: boolean
	loading?: boolean | LoadingOptions
	prefix?: ReactNode
	suffix?: ReactNode
	className?: string
}

export type ButtonProps = ButtonBaseProps &
	(DistributiveOmit<PolymorphicProps<'button'>, 'prefix'> & { ref?: Ref<HTMLButtonElement> })

export function Button({
	variant,
	color,
	size,
	block = false,
	className,
	children,
	href,
	ref,
	ripple = false,
	spring = false,
	loading: loadingProp = false,
	prefix,
	suffix,
	...props
}: ButtonProps) {
	const loading = !!loadingProp

	const loadingOptions = typeof loadingProp === 'object' ? loadingProp : undefined

	const alert = useAlertContext()
	const glass = useGlass()
	const inputSize = useInputSize()
	const skeleton = useSkeleton()

	const resolvedVariant = variant ?? (glass ? 'glass' : undefined)

	const resolvedSize = size ?? inputSize

	const { onPointerDown: handleRipple, element: rippleElement } = useRipple()

	const tap = useTap(spring)

	const pointerDown = (e: PointerEvent<HTMLElement>) => {
		if (ripple) handleRipple(e)

		const consumerHandler = (props as { onPointerDown?: (e: PointerEvent<HTMLElement>) => void })
			.onPointerDown

		consumerHandler?.(e)
	}

	if (!color && alert) {
		color = alert.variant === 'solid' ? 'inherit' : alert.color
	}

	const classes = cn(
		buttonVariants({ variant: resolvedVariant, color, size: resolvedSize }),
		block && 'w-full',
		className,
	)

	if (skeleton) {
		return (
			<Placeholder
				className={cn(kokkaku.button.base, kokkaku.button.size[resolvedSize ?? 'md'], className)}
			/>
		)
	}

	const content = (
		<ButtonSizeProvider value={resolvedSize ?? 'md'}>
			{loading ? <Spinner {...loadingOptions} /> : prefix}
			{children}
			{suffix && suffix}
		</ButtonSizeProvider>
	)

	const iconOnly = !children && !!(prefix || suffix)

	if (href !== undefined) {
		return (
			<motion.span {...tap} className="inline-flex">
				<Link
					data-slot="button"
					data-has-prefix={!!prefix}
					data-has-suffix={!!suffix}
					data-icon-only={iconOnly || undefined}
					href={href}
					className={classes}
					{...(props as Omit<React.ComponentPropsWithoutRef<typeof Link>, 'href' | 'className'>)}
					{...(loading && { 'aria-disabled': true, 'data-disabled': true, 'aria-busy': true })}
					onPointerDown={pointerDown}
				>
					{ripple && rippleElement}
					<TouchTarget>{content}</TouchTarget>
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
			ref={ref}
			data-slot="button"
			data-has-prefix={!!prefix}
			data-has-suffix={!!suffix}
			data-icon-only={iconOnly || undefined}
			type="button"
			className={classes}
			{...buttonProps}
			disabled={loading || buttonProps.disabled}
			aria-busy={loading || undefined}
			onPointerDown={pointerDown}
		>
			{ripple && rippleElement}
			<TouchTarget>{content}</TouchTarget>
		</motion.button>
	)
}
