'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/ready-reveal'
import { ReducedMotion } from '../reduced-motion'

export type ReadyRevealProps = {
	/** When true, reveals `children`; when false, shows `placeholder`. */
	ready: boolean
	/** Content shown while not ready. */
	placeholder: ReactNode
	/** Content revealed once ready. */
	children: ReactNode
	/** Outer container class. */
	className?: string
}

const HIDDEN = { opacity: 0, filter: 'blur(4px)' }
const VISIBLE = { opacity: 1, filter: 'blur(0px)' }

const GRID_CELL = { gridArea: '1 / 1' } as const

/**
 * Crossfade transition between a placeholder and real content.
 * The placeholder should mirror the content layout so dimensions stay stable.
 */
export function ReadyReveal({ ready, placeholder, children, className }: ReadyRevealProps) {
	return (
		<ReducedMotion>
			<div
				data-slot="ready-reveal"
				className={cn('grid', className)}
				style={{ gridTemplate: '1fr / 1fr' }}
			>
				<motion.div
					aria-hidden={ready}
					animate={ready ? HIDDEN : VISIBLE}
					initial={false}
					transition={k.transition}
					style={{ ...GRID_CELL, pointerEvents: ready ? 'none' : undefined }}
				>
					{placeholder}
				</motion.div>
				<motion.div
					aria-hidden={!ready}
					animate={ready ? VISIBLE : HIDDEN}
					initial={false}
					transition={k.transition}
					style={{ ...GRID_CELL, pointerEvents: ready ? undefined : 'none' }}
				>
					{children}
				</motion.div>
			</div>
		</ReducedMotion>
	)
}
