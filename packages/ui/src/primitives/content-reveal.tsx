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
	 * - `crossfade` (default) — both children always rendered in a grid cell, pure opacity + blur
	 * - `wait` — placeholder exits fully before content enters (includes vertical shift)
	 */
	mode?: 'crossfade' | 'wait'
}

const hidden = { opacity: 0, filter: 'blur(4px)' }
const visible = { opacity: 1, filter: 'blur(0px)' }

/**
 * Animated transition wrapper that crossfades between a placeholder
 * and real content. The placeholder should mirror the content's layout
 * (a "carbon copy") so dimensions remain stable during the swap.
 *
 * Both children are always rendered in the same CSS grid cell —
 * the container height is locked to max(placeholder, content),
 * preventing any layout shift during the transition.
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
			<AnimatePresence mode="wait" initial={false}>
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
			<motion.div
				aria-hidden={ready}
				animate={ready ? hidden : visible}
				initial={false}
				transition={ugoki.reveal.transition}
				style={{ gridArea: '1 / 1', pointerEvents: ready ? 'none' : undefined }}
			>
				{placeholder}
			</motion.div>
			<motion.div
				animate={ready ? visible : hidden}
				initial={false}
				transition={ugoki.reveal.transition}
				style={{ gridArea: '1 / 1', pointerEvents: ready ? undefined : 'none' }}
			>
				{children}
			</motion.div>
		</div>
	)
}
