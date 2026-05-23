'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { FloatingSurface } from '../../primitives/floating-surface'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/tooltip'
import { useGlass } from '../glass/context'
import { useTooltipContext } from './context'

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
			data-step={resolvedSize}
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
