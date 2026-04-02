'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
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
	 * - `crossfade` (default) — both children overlap in a grid cell, height = max(both)
	 * - `wait` — crossfade with height animating to match the active child
	 */
	mode?: 'crossfade' | 'wait'
}

const hidden = { opacity: 0, filter: 'blur(4px)' }
const visible = { opacity: 1, filter: 'blur(0px)' }
const gridCell = { gridArea: '1 / 1' } as const

/**
 * Animated transition wrapper that crossfades between a placeholder
 * and real content. The placeholder should mirror the content's layout
 * (a "carbon copy") so dimensions remain stable during the swap.
 *
 * Both children are always rendered in the same CSS grid cell.
 * In crossfade mode the container height is max(placeholder, content).
 * In wait mode the container height animates to match the active child.
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
			<WaitReveal ready={ready} placeholder={placeholder} className={className}>
				{children}
			</WaitReveal>
		)
	}

	return (
		<div className={cn('grid', className)} style={{ gridTemplate: '1fr / 1fr' }}>
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
	)
}

const inFlow = { position: 'relative' as const, top: 'auto' as const }
const outOfFlow = { position: 'absolute' as const, top: 0, left: 0, right: 0 }

function WaitReveal({ ready, placeholder, children, className }: Omit<ContentRevealProps, 'mode'>) {
	const placeholderRef = useRef<HTMLDivElement>(null)
	const contentRef = useRef<HTMLDivElement>(null)
	const [height, setHeight] = useState<number | undefined>(undefined)

	useEffect(() => {
		const el = ready ? contentRef.current : placeholderRef.current
		if (!el) return

		const ro = new ResizeObserver(([entry]) => {
			setHeight(entry.contentRect.height)
		})
		ro.observe(el)
		return () => ro.disconnect()
	}, [ready])

	return (
		<motion.div
			animate={height !== undefined ? { height } : undefined}
			initial={false}
			transition={ugoki.reveal.transition}
			className={cn('relative overflow-hidden', className)}
		>
			<motion.div
				ref={placeholderRef}
				aria-hidden={ready}
				animate={ready ? hidden : visible}
				initial={false}
				transition={ugoki.reveal.transition}
				style={{ ...(ready ? outOfFlow : inFlow), pointerEvents: ready ? 'none' : undefined }}
			>
				{placeholder}
			</motion.div>
			<motion.div
				ref={contentRef}
				animate={ready ? visible : hidden}
				initial={false}
				transition={ugoki.reveal.transition}
				style={{ ...(ready ? inFlow : outOfFlow), pointerEvents: ready ? undefined : 'none' }}
			>
				{children}
			</motion.div>
		</motion.div>
	)
}
