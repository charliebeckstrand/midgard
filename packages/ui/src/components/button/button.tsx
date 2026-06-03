'use client'

import { motion } from 'motion/react'
import type { ComponentPropsWithoutRef, PointerEvent, ReactNode, Ref } from 'react'
import { Children } from 'react'
import { cn } from '../../core'
import { AffixContext } from '../../primitives/affix'
import { useSizeWide } from '../../primitives/density'
import type { PolymorphicProps } from '../../primitives/polymorphic'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { TouchTarget } from '../../primitives/touch-target'
import { useSkeleton } from '../../providers/skeleton'
import { type ButtonVariants, k } from '../../recipes/kata/button'
import { useHeadless } from '../headless/context'
import { Link } from '../link'
import { Spinner, type SpinnerProps } from '../spinner'
import { buttonSpring } from './button-constants'
import { ButtonHeadless } from './button-headless'
import { ButtonSkeleton } from './button-skeleton'
import { isIconElement } from './button-utilities'

type LoadingOptions = Pick<SpinnerProps, 'color' | 'size' | 'label'>

type ButtonBaseProps = ButtonVariants & {
	block?: boolean
	spring?: boolean
	loading?: boolean | LoadingOptions
	prefix?: ReactNode
	suffix?: ReactNode
	'data-slot'?: string
	className?: string
}

export type ButtonProps = ButtonBaseProps &
	(
		| (Extract<PolymorphicProps<'button', 'prefix'>, { href?: never }> & {
				ref?: Ref<HTMLButtonElement>
		  })
		| (Extract<PolymorphicProps<'button', 'prefix'>, { href: string }> & {
				ref?: Ref<HTMLAnchorElement>
		  })
	)

export function Button({
	variant,
	color,
	size,
	block = false,
	className,
	children,
	href,
	ref,
	spring = false,
	loading: loadingProp = false,
	prefix,
	suffix,
	'data-slot': slot = 'button',
	...props
}: ButtonProps) {
	const loading = !!loadingProp

	const loadingOptions = typeof loadingProp === 'object' ? loadingProp : undefined

	const headless = useHeadless()
	const skeleton = useSkeleton()

	const resolvedSize = useSizeWide(size)

	if (headless) {
		return (
			<ButtonHeadless
				ref={ref as Ref<HTMLButtonElement> | Ref<HTMLAnchorElement> | undefined}
				href={href}
				data-slot={slot}
				className={className}
				loading={loading}
				{...(props as ComponentPropsWithoutRef<'button'>)}
			>
				{children}
			</ButtonHeadless>
		)
	}

	// Children that are not icons count as a text label; labeled buttons drop to
	// the matching control height (see `data-[has-label]` in the button recipe),
	// while icon-only buttons stay square.
	const hasLabel = Children.toArray(children).some((child) => !isIconElement(child))

	const classes = cn(k({ variant, color, size: resolvedSize }), block && 'w-full', className)

	if (skeleton) {
		return <ButtonSkeleton size={size} className={className} />
	}

	const content = (
		<AffixContext value={resolvedSize}>
			{loading ? <Spinner {...loadingOptions} /> : prefix}
			{children}
			{suffix}
		</AffixContext>
	)

	const handlePointerDown = (e: PointerEvent<HTMLElement>) => {
		const consumerHandler = (props as { onPointerDown?: (e: PointerEvent<HTMLElement>) => void })
			.onPointerDown

		consumerHandler?.(e)
	}

	if (href !== undefined) {
		return (
			<ReducedMotion>
				<motion.span {...(spring && buttonSpring)}>
					<Link
						ref={ref as Ref<HTMLAnchorElement>}
						data-slot={slot}
						data-variant={variant}
						data-density={resolvedSize}
						data-has-prefix={!!prefix || undefined}
						data-has-suffix={!!suffix || undefined}
						data-has-label={hasLabel || undefined}
						href={href}
						className={classes}
						{...(props as Omit<ComponentPropsWithoutRef<typeof Link>, 'href' | 'className'>)}
						{...(loading && { 'aria-disabled': true, 'data-disabled': true, 'aria-busy': true })}
						onPointerDown={handlePointerDown}
					>
						<TouchTarget>{content}</TouchTarget>
					</Link>
				</motion.span>
			</ReducedMotion>
		)
	}

	const buttonProps = props as Omit<
		ComponentPropsWithoutRef<'button'>,
		'className' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
	>

	return (
		<ReducedMotion>
			<motion.button
				{...(spring && buttonSpring)}
				ref={ref as Ref<HTMLButtonElement>}
				data-slot={slot}
				data-variant={variant}
				data-density={resolvedSize}
				data-has-prefix={!!prefix || undefined}
				data-has-suffix={!!suffix || undefined}
				data-has-label={hasLabel || undefined}
				type="button"
				className={classes}
				{...buttonProps}
				disabled={loading || buttonProps.disabled}
				aria-busy={loading || undefined}
				onPointerDown={handlePointerDown}
			>
				<TouchTarget>{content}</TouchTarget>
			</motion.button>
		</ReducedMotion>
	)
}
