'use client'

import { Children } from 'react'
import { cn } from '../../core'
import { Density } from '../../primitives/density'
import { intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import type { PolymorphicProps } from '../../primitives/polymorphic'
import { TouchTarget } from '../../primitives/touch-target'
import { useSlots } from '../../providers/headless/use-slots'
import { k } from '../../recipes/kata/button'
import { LoadingSpinner } from '../loading'
import { ButtonBase, type ButtonBaseProps } from './button-base'
import { type ButtonOwnProps, isIconElement, isVisuallyHiddenElement } from './button-utilities'
import { useButtonDefaults } from './context'

/**
 * Props for {@link Button}: visual `variant`/`color`/`size`, the `loading`
 * behavior flag, `prefix`/`suffix` adornments, and the polymorphic surface (a
 * `<button>`, or an anchor when `href` is set).
 */
export type ButtonProps = ButtonOwnProps & PolymorphicProps<'button', 'prefix'>

/**
 * Polymorphic action control: renders a `<button>` or, when `href` is set,
 * a `<Link>` anchor. Without `size`, it takes the step of the nearest density
 * scope through stepped classes, and reads no context. An explicit `size`
 * makes the button its own scope. It swaps in a `<LoadingSpinner>` while
 * `loading`. It collapses to a square hit area when icon-only. Under
 * `HeadlessProvider`, it keeps its behavior and its content, and drops its
 * classes and its hit area. Compose `<ButtonSkeleton>` in loading trees. A button with no `variant` or `color` takes the one of the
 * surface around it, such as the soft color of an alert for its actions. The
 * defaults of a surface stop at a portal, such as a dialog that an action opens.
 *
 * A loading button stays enabled, so it keeps the focus that it has. It is
 * `aria-disabled`, leaves the tab order, and cancels each activation, the
 * submission of its form included. In a locked scope, such as a `Form` while a
 * submit runs, a button is `aria-disabled` and cancels each activation too, but
 * it stays in the tab order. Pass `lockable={false}` to keep it live.
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
	loading = false,
	prefix,
	suffix,
	'data-slot': slot = 'button',
	...props
}: ButtonProps) {
	const intl = useIntl()

	const { variant, color } = useButtonDefaults({ variant: variantProp, color: colorProp })

	const slots = useSlots(k, { variant, color })

	// Non-icon children count as a text label; labeled buttons use control height
	// (see `data-has-label` in the button recipe), icon-only buttons stay square.
	// A visually hidden child, such as an `sr-only` name, takes no room, so it is
	// not a label.
	const hasLabel = Children.toArray(children).some(
		(child) => !isIconElement(child) && !isVisuallyHiddenElement(child),
	)

	return (
		<ButtonBase
			data-slot={slot}
			// Always written, the recipe default included: the children that size
			// themselves in a button (LoadingSpinner, LoadingDots, Kbd) select a
			// parent with `data-variant`, which survives a wrapper that rewrites
			// `data-slot`.
			data-variant={variant ?? 'solid'}
			data-density={size}
			data-has-prefix={!!prefix || undefined}
			data-has-suffix={!!suffix || undefined}
			data-has-label={hasLabel || undefined}
			className={cn(slots.base, className)}
			loading={loading}
			// Consumer props spread later can still override the data attributes.
			{...(props as ButtonBaseProps)}
		>
			<TouchTarget>
				<Density step={size}>
					{/* The spinner takes the place of the leading content while the button loads. */}
					{loading ? <LoadingSpinner label={intl.formatMessage(intlMessages.loading)} /> : prefix}
					{/* The spinner takes the place of the icon of an icon-only button, so the
					    button keeps its square. The icon stays for assistive technology. */}
					{loading && !hasLabel ? <span className="sr-only">{children}</span> : children}
					{suffix}
				</Density>
			</TouchTarget>
		</ButtonBase>
	)
}
