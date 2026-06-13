import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k, type StatusDotVariants } from '../../recipes/kata/status'

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
} & Omit<ComponentPropsWithoutRef<'span'>, 'className'>

/**
 * Colored status indicator dot: a `currentColor`-filled (`solid`) or
 * `currentColor`-bordered (`outline`) circle whose hue encodes `status`
 * (inactive/active/info/warning/error), optionally `pulse`-animated. A static
 * leaf with no client hooks, so it renders in React Server Components.
 *
 * @remarks
 * `size` is explicit and defaults to `md`; hosts that render the dot (Avatar)
 * pass their resolved Density size rather than relying on the default. Color
 * alone conveys status, so pass `label` for a standalone dot to name it via
 * `role="img"` (WCAG 1.4.1 / 1.1.1) and omit it when the dot is decorative
 * beside visible text.
 */
export function StatusDot({
	variant,
	status,
	size,
	pulse,
	label,
	className,
	...props
}: StatusDotProps) {
	const resolvedSize = size ?? 'md'

	// A bare <span> can't carry aria-label; name it only by promoting it to an
	// image. The role and label stay paired.
	const labelProps = label ? ({ role: 'img', 'aria-label': label } as const) : undefined

	return (
		<span
			data-slot="status-dot"
			data-size={resolvedSize}
			className={cn(k({ variant, status, size: resolvedSize, pulse }), className)}
			{...labelProps}
			{...props}
		/>
	)
}
