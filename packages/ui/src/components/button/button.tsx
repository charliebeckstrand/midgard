'use client'

import { motion } from 'motion/react'
import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { Children } from 'react'
import { cn } from '../../core'
import { AffixContext } from '../../primitives/affix'
import { useSize } from '../../primitives/density'
import type { PolymorphicProps } from '../../primitives/polymorphic'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { TouchTarget } from '../../primitives/touch-target'
import { useSkeleton } from '../../providers/skeleton'
import { type ButtonVariants, k } from '../../recipes/kata/button'
import { useHeadless } from '../headless/context'
import { Link } from '../link'
import { LoadingSpinner, type LoadingSpinnerProps } from '../loading'
import { buttonSpring } from './button-constants'
import { ButtonHeadless } from './button-headless'
import { ButtonSkeleton } from './button-skeleton'
import { isIconElement } from './button-utilities'

type LoadingOptions = Pick<LoadingSpinnerProps, 'color' | 'size' | 'label'>

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

/**
 * Polymorphic action control — renders a `<button>` or, when `href` is set,
 * a `<Link>` anchor. Resolves `size` against enclosing Density, swaps in a
 * `<LoadingSpinner>` while `loading`, collapses to a square hit area when icon-only,
 * and degrades to skeleton or headless output under those providers.
 */
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

	const resolvedSize = useSize(size)

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

	// An icon-only button has no text to name it. Surface the missing accessible
	// name in development; the loading spinner carries its own label, so skip it
	// while loading. Dev-only — stripped in production.
	if (process.env.NODE_ENV !== 'production' && !hasLabel && !loading) {
		const named =
			props['aria-label'] != null || props['aria-labelledby'] != null || props.title != null

		if (!named) {
			console.error(
				'Button: an icon-only button has no accessible name. Pass `aria-label` (or `aria-labelledby` / `title`).',
			)
		}
	}

	const classes = cn(k({ variant, color, size: resolvedSize }), block && 'w-full', className)

	if (skeleton) {
		return <ButtonSkeleton size={size} className={className} />
	}

	const content = (
		<AffixContext value={resolvedSize}>
			{loading ? <LoadingSpinner {...loadingOptions} /> : prefix}
			{children}
			{suffix}
		</AffixContext>
	)

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
			>
				<TouchTarget>{content}</TouchTarget>
			</motion.button>
		</ReducedMotion>
	)
}
