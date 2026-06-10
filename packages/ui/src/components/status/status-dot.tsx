'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { k, type StatusDotVariants } from '../../recipes/kata/status'

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

export function StatusDot({
	variant,
	status,
	size,
	pulse,
	label,
	className,
	...props
}: StatusDotProps) {
	const inherited = useDensity()

	const resolvedSize = size ?? inherited.size

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
