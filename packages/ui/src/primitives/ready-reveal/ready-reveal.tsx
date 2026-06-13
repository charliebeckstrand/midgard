'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/ready-reveal'
import { ReducedMotion } from '../reduced-motion'

/** Props for {@link ReadyReveal}. */
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
 * Gates content on a `ready` flag, crossfading (opacity plus blur) from
 * `placeholder` to `children` to avoid a flash of unready content. The two
 * layers share one grid cell so the placeholder mirrors the content layout and
 * dimensions stay stable across the swap.
 *
 * @remarks
 * Wraps its layers in {@link ReducedMotion}, so the crossfade honours
 * `prefers-reduced-motion`. The inactive layer is `inert` and `aria-hidden`,
 * keeping it out of the tab order and accessibility tree.
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
					// `inert` keeps the hidden layer's descendants out of the Tab
					// order and off the a11y tree.
					inert={ready}
					animate={ready ? HIDDEN : VISIBLE}
					initial={false}
					transition={k.transition}
					style={{ ...GRID_CELL, pointerEvents: ready ? 'none' : undefined }}
				>
					{placeholder}
				</motion.div>
				<motion.div
					aria-hidden={!ready}
					inert={!ready}
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
