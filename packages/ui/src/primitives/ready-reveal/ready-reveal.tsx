'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { ugoki } from '../../recipes'
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

const hidden = { opacity: 0, filter: 'blur(4px)' }
const visible = { opacity: 1, filter: 'blur(0px)' }

const gridCell = { gridArea: '1 / 1' } as const

/**
 * Crossfade transition between a placeholder and real content.
 * The placeholder should mirror the content layout so dimensions stay stable.
 * */
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
					animate={ready ? hidden : visible}
					initial={false}
					transition={ugoki.reveal.transition}
					style={{ ...gridCell, pointerEvents: ready ? 'none' : undefined }}
				>
					{placeholder}
				</motion.div>
				<motion.div
					animate={ready ? visible : hidden}
					initial={false}
					transition={ugoki.reveal.transition}
					style={{ ...gridCell, pointerEvents: ready ? undefined : 'none' }}
				>
					{children}
				</motion.div>
			</div>
		</ReducedMotion>
	)
}
