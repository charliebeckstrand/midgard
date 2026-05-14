'use client'

import { motion } from 'motion/react'
import {
	Children,
	type ComponentPropsWithoutRef,
	isValidElement,
	type PointerEvent,
	type ReactNode,
	type Ref,
} from 'react'
import { cn } from '../../core'
import { useRipple } from '../../hooks'
import {
	type PolymorphicProps,
	ReducedMotion,
	springProps,
	TouchTarget,
	useConcentric,
} from '../../primitives'
import { kokkaku } from '../../recipes'
import { type ButtonVariants, buttonVariants } from '../../recipes/kata/button'
import { useGlass } from '../glass/context'
import { useHeadless } from '../headless/context'
import { Icon } from '../icon'
import { useAffixSize } from '../input/context'
import { Link } from '../link'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { Spinner, type SpinnerProps } from '../spinner'
import { ButtonSizeProvider } from './context'

export type LoadingOptions = Pick<SpinnerProps, 'color' | 'size' | 'label'>

// An "icon" child is the library's <Icon>, a raw <svg>, or any element that
// opts into the convention by carrying data-slot="icon". Anything else passed
// as children is treated as a textual label for sizing purposes.
function isIconElement(node: unknown): boolean {
	if (!isValidElement(node)) return false

	if (node.type === Icon || node.type === 'svg') return true

	const props = node.props as { 'data-slot'?: unknown }

	return props['data-slot'] === 'icon'
}

function hasLabelContent(children: ReactNode): boolean {
	return Children.toArray(children).some((child) => {
		if (typeof child === 'string') return child.trim().length > 0

		if (typeof child === 'number' || typeof child === 'bigint') return true

		return isValidElement(child) && !isIconElement(child)
	})
}

type ButtonBaseProps = ButtonVariants & {
	block?: boolean
	ripple?: boolean
	spring?: boolean
	loading?: boolean | LoadingOptions
	prefix?: ReactNode
	suffix?: ReactNode
	/** Override the rendered `data-slot`. Defaults to `'button'`. */
	dataSlot?: string
	className?: string
}

export type ButtonProps = ButtonBaseProps &
	PolymorphicProps<'button', 'prefix'> & { ref?: Ref<HTMLButtonElement> }

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
	dataSlot = 'button',
	...props
}: ButtonProps) {
	const loading = !!loadingProp

	const loadingOptions = typeof loadingProp === 'object' ? loadingProp : undefined

	const affixSize = useAffixSize()
	const concentric = useConcentric()
	const glass = useGlass()
	const headless = useHeadless()
	const skeleton = useSkeleton()

	const { onPointerDown: handleRipple, element: rippleElement } = useRipple()

	if (headless) {
		if (href !== undefined) {
			return (
				<Link
					data-slot={dataSlot}
					href={href}
					className={className}
					{...(props as Omit<ComponentPropsWithoutRef<typeof Link>, 'href' | 'className'>)}
					{...(loading && { 'aria-disabled': true, 'data-disabled': true, 'aria-busy': true })}
				>
					{children}
				</Link>
			)
		}

		const bareButtonProps = props as Omit<ComponentPropsWithoutRef<'button'>, 'className'>

		return (
			<button
				ref={ref}
				data-slot={dataSlot}
				type="button"
				className={className}
				{...bareButtonProps}
				disabled={loading || bareButtonProps.disabled}
				aria-busy={loading || undefined}
			>
				{children}
			</button>
		)
	}

	const resolvedVariant = variant ?? (glass ? 'glass' : undefined)

	// Resolution order: explicit prop, then AffixSize (scoped broadcast from
	// the enclosing Input / SelectTrigger when this button is rendered as an
	// affix), then the ambient concentric size (provided by surfaces like
	// <Card> / <Group> / <Drawer> / <Popover> / <Density>). Component's own
	// default kicks in only when all of these are absent.
	//
	// AffixSize wins over Concentric because it's a more specific signal:
	// AffixSize is set only inside an affix context, so when it's present it
	// reflects the "icon-sized" intent that should override the outer surface
	// size (e.g. a clear button inside an md Input under compact Density still
	// renders one step smaller than the input).
	const resolvedSize = size ?? affixSize ?? concentric?.size

	const springMotion = springProps(spring)

	const pointerDown = (e: PointerEvent<HTMLElement>) => {
		if (ripple) handleRipple(e)

		const consumerHandler = (props as { onPointerDown?: (e: PointerEvent<HTMLElement>) => void })
			.onPointerDown

		consumerHandler?.(e)
	}

	const labelled = hasLabelContent(children)

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
			{suffix}
		</ButtonSizeProvider>
	)

	if (href !== undefined) {
		return (
			<ReducedMotion>
				<motion.span {...springMotion} className="inline-flex">
					<Link
						data-slot={dataSlot}
						data-has-prefix={!!prefix || undefined}
						data-has-label={labelled || undefined}
						data-has-suffix={!!suffix || undefined}
						href={href}
						className={classes}
						{...(props as Omit<ComponentPropsWithoutRef<typeof Link>, 'href' | 'className'>)}
						{...(loading && { 'aria-disabled': true, 'data-disabled': true, 'aria-busy': true })}
						onPointerDown={pointerDown}
					>
						{ripple && rippleElement}
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
				{...springMotion}
				ref={ref}
				data-slot={dataSlot}
				data-has-prefix={!!prefix || undefined}
				data-has-label={labelled || undefined}
				data-has-suffix={!!suffix || undefined}
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
		</ReducedMotion>
	)
}
