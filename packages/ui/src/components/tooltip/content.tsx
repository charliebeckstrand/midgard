'use client'

import { FloatingPortal } from '@floating-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { ReducedMotion } from '../../primitives'
import { ugoki } from '../../recipes'
import { k } from '../../recipes/kata/tooltip'
import { useGlass } from '../glass/context'
import { useTooltipContext } from './tooltip'

export type TooltipContentProps = {
	className?: string
	children: ReactNode
}

export function TooltipContent({ className, children }: TooltipContentProps) {
	const { open, interactive, setFloating, floatingStyles, getFloatingProps } = useTooltipContext()

	const glass = useGlass()

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
							className={k.portal}
							{...getFloatingProps()}
						>
							<motion.div
								{...ugoki.tooltip}
								className={cn(
									k.content,
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
