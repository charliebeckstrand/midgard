'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { FloatingSurface } from '../../primitives/floating-surface'
import { useGlass } from '../../providers/glass/context'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/tooltip'
import { useTooltipContext } from './context'

/** Props for {@link TooltipContent}. */
export type TooltipContentProps = {
	/**
	 * Size step that drives padding and text size. Overrides any `size` passed
	 * to the parent `<Tooltip>`.
	 *
	 * Resolution order: explicit prop, then `<Tooltip size>`, then enclosing
	 * Density size, then `'md'`.
	 */
	size?: Step
	className?: string
	children: ReactNode
}

/**
 * Floating panel rendered when the enclosing `<Tooltip>` is open. Positions
 * via `<FloatingSurface>`, animates in, and adopts the glass surface when a
 * `<GlassProvider>` is active.
 *
 * @remarks Pointer events are disabled unless the tooltip is `interactive`,
 * so a non-interactive panel never intercepts hover.
 */
export function TooltipContent({ size, className, children }: TooltipContentProps) {
	const {
		open,
		interactive,
		size: rootSize,
		setFloating,
		floatingStyles,
		getFloatingProps,
	} = useTooltipContext()

	const glass = useGlass()
	const inherited = useDensity()

	const resolvedSize: Step = size ?? rootSize ?? inherited.size

	return (
		<FloatingSurface
			open={open}
			setFloating={setFloating}
			floatingStyles={floatingStyles}
			getFloatingProps={getFloatingProps}
			style={{ pointerEvents: interactive ? 'auto' : 'none' }}
			data-slot="tooltip-content"
			data-size={resolvedSize}
		>
			<motion.div
				{...k.motion}
				className={cn(
					k.content({ size: resolvedSize }),
					interactive ? 'pointer-events-auto' : 'pointer-events-none',
					k.surface[glass ? 'glass' : 'default'],
					className,
				)}
			>
				{children}
			</motion.div>
		</FloatingSurface>
	)
}
