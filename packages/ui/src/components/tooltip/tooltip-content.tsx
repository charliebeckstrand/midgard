'use client'

import { FloatingPortal } from '@floating-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { ReducedMotion } from '../../primitives/reduced-motion'
import type { Step } from '../../recipes'
import { ugoki } from '../../recipes'
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
		<FloatingPortal>
			<ReducedMotion>
				<AnimatePresence>
					{open && (
						<div
							ref={setFloating}
							style={{
								...floatingStyles,
								pointerEvents: interactive ? 'auto' : 'none',
							}}
							data-slot="tooltip-content"
							data-step={resolvedSize}
							className={k.portal}
							{...getFloatingProps()}
						>
							<motion.div
								{...ugoki.tooltip}
								className={cn(
									k.content({ size: resolvedSize }),
									k.surface[glass ? 'glass' : 'default'],
									interactive && 'pointer-events-auto',
									className,
								)}
							>
								{children}
							</motion.div>
						</div>
					)}
				</AnimatePresence>
			</ReducedMotion>
		</FloatingPortal>
	)
}
