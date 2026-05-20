'use client'

import { motion } from 'motion/react'
import type { ComponentPropsWithoutRef, PointerEvent, ReactNode, Ref } from 'react'
import { cn } from '../../core'
import { AffixProvider } from '../../primitives/affix'
import { useSizeWide } from '../../primitives/density'
import type { PolymorphicProps } from '../../primitives/polymorphic'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { TouchTarget } from '../../primitives/touch-target'
import { useSkeleton } from '../../providers/skeleton'
import { type ButtonVariants, buttonVariants } from '../../recipes/kata/button'
import { useGlass } from '../glass/context'
import { useHeadless } from '../headless/context'
import { Link } from '../link'
import { Spinner, type SpinnerProps } from '../spinner'
import { buttonSpring } from './button-constants'
import { ButtonHeadless } from './button-headless'
import { ButtonSkeleton } from './button-skeleton'
import { hasLabelContent } from './button-utilities'

export type LoadingOptions = Pick<SpinnerProps, 'color' | 'size' | 'label'>

type ButtonBaseProps = ButtonVariants & {
	block?: boolean
	spring?: boolean
	loading?: boolean | LoadingOptions
	prefix?: ReactNode
	suffix?: ReactNode
	dataSlot?: string
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
	dataSlot = 'button',
	...props
}: ButtonProps) {
	const loading = !!loadingProp

	const loadingOptions = typeof loadingProp === 'object' ? loadingProp : undefined

	const glass = useGlass()
	const headless = useHeadless()
	const skeleton = useSkeleton()

	const resolvedSize = useSizeWide(size)

	if (headless) {
		return (
			<ButtonHeadless
				ref={ref as Ref<HTMLButtonElement> | Ref<HTMLAnchorElement> | undefined}
				href={href}
				dataSlot={dataSlot}
				className={className}
				loading={loading}
				{...(props as ComponentPropsWithoutRef<'button'>)}
			>
				{children}
			</ButtonHeadless>
		)
	}

	const resolvedVariant = variant ?? (glass ? 'glass' : undefined)

	const classes = cn(
		buttonVariants({ variant: resolvedVariant, color, size: resolvedSize }),
		block && 'w-full',
		className,
	)

	if (skeleton) {
		return <ButtonSkeleton size={size} className={className} />
	}

	const labelled = hasLabelContent(children)

	const content = (
		<AffixProvider value={resolvedSize}>
			{loading ? <Spinner {...loadingOptions} /> : prefix}
			{children}
			{suffix}
		</AffixProvider>
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
						data-slot={dataSlot}
						data-variant={resolvedVariant}
						data-has-prefix={!!prefix || undefined}
						data-has-label={labelled || undefined}
						data-has-suffix={!!suffix || undefined}
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
				data-slot={dataSlot}
				data-variant={resolvedVariant}
				data-has-prefix={!!prefix || undefined}
				data-has-label={labelled || undefined}
				data-has-suffix={!!suffix || undefined}
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
