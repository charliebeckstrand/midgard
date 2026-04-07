'use client'

import { Children, isValidElement, type PointerEvent } from 'react'
import { cn, Link } from '../../core'
import { type PolymorphicProps, TouchTarget, useRipple } from '../../primitives'
import { ButtonSizeProvider } from './context'
import { type ButtonVariants, buttonVariants, iconOnlySize, withIconSize } from './variants'

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
	ripple?: boolean
}

export type ButtonProps = ButtonBaseProps & PolymorphicProps<'button'>

export function Button({
	variant,
	color,
	size,
	className,
	children,
	href,
	ripple = variant !== 'ghost',
	...props
}: ButtonProps) {
	const iconOnly = isIconOnly(children)
	const { onPointerDown: handleRipple, element: rippleElement } = useRipple()

	const classes = cn(
		buttonVariants({ variant, color, size }),
		iconOnly && iconOnlySize({ size }),
		!iconOnly && hasIcon(children) && withIconSize({ size }),
		className,
	)

	const pointerDown = (e: PointerEvent<HTMLElement>) => {
		if (ripple) handleRipple(e)
	}

	if (href !== undefined) {
		return (
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
		)
	}

	return (
		<button
			data-slot="button"
			type="button"
			className={classes}
			{...(props as Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)}
			onPointerDown={pointerDown}
		>
			{ripple && rippleElement}
			<TouchTarget>
				<ButtonSizeProvider value={size ?? 'md'}>{children}</ButtonSizeProvider>
			</TouchTarget>
		</button>
	)
}
