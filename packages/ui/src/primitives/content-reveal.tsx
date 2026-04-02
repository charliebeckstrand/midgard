'use client'

import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { cn } from '../core'
import { ugoki } from '../recipes'

export type ContentRevealProps = {
	/**
	 * Controls which child is shown.
	 * When `true`, animates in `children`; when `false`, shows `placeholder`.
	 */
	ready: boolean
	/** Placeholder content shown while not ready */
	placeholder: React.ReactNode
	/** Real content revealed when ready */
	children: React.ReactNode
	/** Optional className for the outer container */
	className?: string
	/**
	 * Animation mode:
	 * - `crossfade` (default) — both children overlap in a grid cell, dimensions stay stable
	 * - `wait` — placeholder exits fully before content enters
	 */
	mode?: 'crossfade' | 'wait'
}

/**
 * Animated transition wrapper that crossfades between a placeholder
 * and real content. The placeholder should mirror the content's layout
 * (a "carbon copy") so dimensions remain stable during the swap.
 *
 * Uses a CSS grid overlay so both children occupy the same cell —
 * the container's size is determined by whichever child is present,
 * preventing layout shift.
 */
export function ContentReveal({
	ready,
	placeholder,
	children,
	className,
	mode = 'crossfade',
}: ContentRevealProps) {
	if (mode === 'wait') {
		return (
			<AnimatePresence mode="wait">
				{ready ? (
					<motion.div key="content" {...ugoki.reveal} className={className}>
						{children}
					</motion.div>
				) : (
					<motion.div key="placeholder" {...ugoki.reveal} className={className}>
						{placeholder}
					</motion.div>
				)}
			</AnimatePresence>
		)
	}

	return (
		<div className={cn('grid', className)} style={{ gridTemplate: '1fr / 1fr' }}>
			<AnimatePresence>
				{!ready && (
					<motion.div key="placeholder" {...ugoki.reveal} style={{ gridArea: '1 / 1' }}>
						{placeholder}
					</motion.div>
				)}
			</AnimatePresence>
			<AnimatePresence>
				{ready && (
					<motion.div key="content" {...ugoki.reveal} style={{ gridArea: '1 / 1' }}>
						{children}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}
