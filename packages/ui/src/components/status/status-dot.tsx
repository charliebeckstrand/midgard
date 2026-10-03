import type { ComponentProps } from 'react'
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
	 * Accessible name for the dot. Color alone conveys status; a standalone
	 * dot needs a text alternative. When set, the dot renders as `role="img"`
	 * with this label (WCAG 1.4.1 / 1.1.1). Omit it when the dot is decorative
	 * and paired with adjacent visible text (e.g. Avatar supplies its own
	 * sr-only status label, and its dot stays silent).
	 */
	label?: string
} & Omit<ComponentProps<'span'>, 'className' | 'color'>

/**
 * Colored status indicator dot: a `currentColor`-filled (`solid`) or
 * `currentColor`-bordered (`outline`) circle whose hue encodes `status`
 * (inactive/active/info/warning/error), optionally `pulse`-animated. A thin
 * skin over {@link Swatch} (`shape="circle"`); a static leaf with no client
 * hooks, so it renders in React Server Components.
 *
 * @remarks
 * Without `size`, the dot takes the step of the nearest density scope, so a
 * dot in an Avatar takes the step of the avatar. Color
 * alone conveys status. Pass `label` for a standalone dot to name it via
 * `role="img"` (WCAG 1.4.1 / 1.1.1). Omit it when the dot is decorative beside
 * visible text.
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
