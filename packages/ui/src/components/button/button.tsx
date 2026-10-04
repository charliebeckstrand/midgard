'use client'

import type { ComponentProps, Ref } from 'react'
import { Children } from 'react'
import { cn } from '../../core'
import { Density } from '../../primitives/density'
import type { PolymorphicProps } from '../../primitives/polymorphic'
import { TouchTarget } from '../../primitives/touch-target'
import { useHeadless } from '../../providers/headless/context'
import { k } from '../../recipes/kata/button'
import { Link } from '../link'
import { LoadingSpinner } from '../loading'
import { loadingProps } from './button-constants'
import { ButtonHeadless } from './button-headless'
import { type ButtonBaseProps, isIconElement, isVisuallyHiddenElement } from './button-utilities'
import { useButtonDefaults } from './context'

/**
 * Props for {@link Button}: visual `variant`/`color`/`size`, the
 * the `loading` behavior flag, `prefix`/`suffix` adornments, and
 * the polymorphic surface — a `<button>`, or an anchor when `href` is set.
 */
export type ButtonProps = ButtonBaseProps & PolymorphicProps<'button', 'prefix'>

/**
 * Polymorphic action control: renders a `<button>` or, when `href` is set,
 * a `<Link>` anchor. Without `size`, it takes the step of the nearest density
 * scope through stepped classes, and reads no context. An explicit `size`
 * makes the button its own scope. It swaps in a `<LoadingSpinner>` while
 * `loading`. It collapses to a square hit area when
 * icon-only, and degrades to headless output under that provider. Compose `<ButtonSkeleton>`
 * in loading trees. A button with no `variant` or `color` takes the one of the
 * surface around it, such as the soft color of an alert for its actions. The
 * defaults of a surface stop at a portal, such as a dialog that an action opens.
 *
 * A loading button stays enabled, so it keeps the focus that it has. It is
 * `aria-disabled`, leaves the tab order, and cancels each activation, the
 * submission of its form included.
 *
 * @remarks
 * Mirrors native `<button>` submission semantics. An untyped Button emits no
 * `type` attribute, so the DOM applies its native `submit` default and the
 * Button submits an enclosing `<Form>`/`<form>`. Pass `type="button"` for
 * non-submitting actions and `type="reset"` to reset.
 */
export function Button({
	variant: variantProp,
	color: colorProp,
	size,
	className,
	children,
	href,
	ref,
	loading = false,
	prefix,
	suffix,
	type,
	'data-slot': slot = 'button',
	...props
}: ButtonProps) {
	const headless = useHeadless()

	const { variant, color } = useButtonDefaults({ variant: variantProp, color: colorProp })

	if (headless) {
		return (
			<ButtonHeadless
				ref={ref as Ref<HTMLButtonElement> | Ref<HTMLAnchorElement> | undefined}
				href={href}
				data-slot={slot}
				className={className}
				loading={loading}
				prefix={prefix}
				suffix={suffix}
				type={type as ComponentProps<'button'>['type']}
				{...(props as ComponentProps<'button'>)}
			>
				{children}
			</ButtonHeadless>
		)
	}

	// Non-icon children count as a text label; labeled buttons use control height
	// (see `data-[has-label]` in the button recipe), icon-only buttons stay square.
	// A visually hidden child, such as an `sr-only` name, takes no room, so it is
	// not a label.
	const hasLabel = Children.toArray(children).some(
		(child) => !isIconElement(child) && !isVisuallyHiddenElement(child),
	)

	const classes = cn(k({ variant, color }), className)

	// Shared across the anchor and button renders; consumer `props` spread later
	// can still override.
	const sharedProps = {
		'data-slot': slot,
		// Always written, the recipe default included: the children that size
		// themselves in a button (LoadingSpinner, LoadingDots, Kbd) select a
		// parent with `data-variant`, which survives a wrapper that rewrites
		// `data-slot`.
		'data-variant': variant ?? 'solid',
		'data-density': size,
		'data-has-prefix': !!prefix || undefined,
		'data-has-suffix': !!suffix || undefined,
		'data-has-label': hasLabel || undefined,
	}

	const content = (
		<Density step={size}>
			{loading ? <LoadingSpinner /> : prefix}
			{/* The spinner takes the place of the icon of an icon-only button, so the
			    button keeps its square. The icon stays for assistive technology. */}
			{loading && !hasLabel ? <span className="sr-only">{children}</span> : children}
			{suffix}
		</Density>
	)

	if (href !== undefined) {
		return (
			<Link
				ref={ref as Ref<HTMLAnchorElement>}
				{...sharedProps}
				href={href}
				type={type}
				className={classes}
				{...(props as Omit<ComponentProps<typeof Link>, 'href' | 'className'>)}
				{...(loading && loadingProps)}
			>
				<TouchTarget>{content}</TouchTarget>
			</Link>
		)
	}

	const buttonProps = props as Omit<ComponentProps<'button'>, 'className'>

	return (
		<button
			ref={ref as Ref<HTMLButtonElement>}
			{...sharedProps}
			type={type}
			className={classes}
			{...buttonProps}
			// A loading button stays enabled, so it keeps the focus that it has. These
			// props cancel its activation instead of `disabled`.
			{...(loading && loadingProps)}
		>
			<TouchTarget>{content}</TouchTarget>
		</button>
	)
}
