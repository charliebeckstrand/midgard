'use client'

import { motion } from 'motion/react'
import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { Children } from 'react'
import { cn } from '../../core'
import { AffixContext } from '../../primitives/affix'
import { useResolvedSize } from '../../primitives/density'
import type { PolymorphicProps } from '../../primitives/polymorphic'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { TouchTarget } from '../../primitives/touch-target'
import { type ButtonVariants, k } from '../../recipes/kata/button'
import { useHeadless } from '../headless/context'
import { Link } from '../link'
import { LoadingSpinner, type LoadingSpinnerProps } from '../loading'
import { buttonSpring, loadingProps } from './button-constants'
import { ButtonHeadless } from './button-headless'
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
 * Polymorphic action control: renders a `<button>` or, when `href` is set,
 * a `<Link>` anchor. Resolves `size` against enclosing Density, swaps in a
 * `<LoadingSpinner>` while `loading`, collapses to a square hit area when icon-only,
 * and degrades to headless output under that provider. Compose `<ButtonSkeleton>`
 * in loading trees.
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

	const resolvedSize = useResolvedSize(size)

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

	// Non-icon children count as a text label; labeled buttons use control height
	// (see `data-[has-label]` in the button recipe), icon-only buttons stay square.
	const hasLabel = Children.toArray(children).some((child) => !isIconElement(child))

	const classes = cn(k({ variant, color, size: resolvedSize }), block && 'w-full', className)

	const content = (
		<AffixContext value={resolvedSize}>
			{/* LoadingSpinner is a static leaf and reads no context; pass the
			    size explicitly. `loadingOptions.size` wins when set. */}
			{loading ? <LoadingSpinner size={resolvedSize} {...loadingOptions} /> : prefix}
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
						data-size={resolvedSize}
						data-has-prefix={!!prefix || undefined}
						data-has-suffix={!!suffix || undefined}
						data-has-label={hasLabel || undefined}
						href={href}
						className={classes}
						{...(props as Omit<ComponentPropsWithoutRef<typeof Link>, 'href' | 'className'>)}
						{...(loading && loadingProps)}
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
				data-size={resolvedSize}
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
