import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import {
	pulse as pulseAnimation,
	type StatusDotVariants,
	statusColor,
} from '../../recipes/kata/status'
import { Swatch } from '../swatch'

/** Props for {@link StatusDot}: recipe variants (`variant`, `status`, `size`, `pulse`) plus an optional accessible `label` and `<span>` attributes. */
export type StatusDotProps = StatusDotVariants & {
	className?: string
	/**
	 * Accessible name for the dot. Colour alone conveys status; a standalone
	 * dot needs a text alternative. When set, the dot renders as `role="img"`
	 * with this label (WCAG 1.4.1 / 1.1.1). Omit it when the dot is decorative
	 * and paired with adjacent visible text (e.g. Avatar supplies its own
	 * sr-only status label, and its dot stays silent).
	 */
	label?: string
} & Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'color'>

/**
 * Colored status indicator dot: a `currentColor`-filled (`solid`) or
 * `currentColor`-bordered (`outline`) circle whose hue encodes `status`
 * (inactive/active/info/warning/error), optionally `pulse`-animated. A thin
 * skin over {@link Swatch} (`shape="circle"`); a static leaf with no client
 * hooks, so it renders in React Server Components.
 *
 * @remarks
 * `size` is explicit and defaults to `md`; hosts that render the dot (Avatar)
 * pass their resolved Density size rather than relying on the default. Color
 * alone conveys status, so pass `label` for a standalone dot to name it via
 * `role="img"` (WCAG 1.4.1 / 1.1.1) and omit it when the dot is decorative
 * beside visible text.
 */
export function StatusDot({
	variant = 'solid',
	status = 'inactive',
	size,
	pulse,
	label,
	className,
	...props
}: StatusDotProps) {
	return (
		<Swatch
			shape="circle"
			variant={variant}
			size={size}
			color={cn(statusColor[status])}
			label={label}
			data-slot="status-dot"
			className={cn(pulse && pulseAnimation, className)}
			{...props}
		/>
	)
}
