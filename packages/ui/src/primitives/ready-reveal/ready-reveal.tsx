'use client'

import { motion } from 'motion/react'
import { type ReactNode, useLayoutEffect, useRef } from 'react'
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

const FOCUSABLE =
	'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Gates content on a `ready` flag, crossfading (opacity plus blur) from
 * `placeholder` to `children` to avoid a flash of unready content. The two
 * layers share one grid cell so the placeholder mirrors the content layout and
 * dimensions stay stable across the swap.
 *
 * @remarks
 * Wraps its layers in {@link ReducedMotion}, so the crossfade honours
 * `prefers-reduced-motion`. The inactive layer is `inert` and `aria-hidden`,
 * keeping it out of the tab order and accessibility tree; if it held focus when
 * it deactivates, focus moves to the revealed layer so keyboard users aren't
 * dropped to the document root.
 */
export function ReadyReveal({ ready, placeholder, children, className }: ReadyRevealProps) {
	const placeholderRef = useRef<HTMLDivElement>(null)

	const contentRef = useRef<HTMLDivElement>(null)

	// The last element focused within either layer, tracked via bubbled focusin.
	// When a `ready` flip sends a focused layer `inert`, the browser drops its
	// focus to <body>; this lets the effect hand focus to the revealed layer
	// instead — but only when the deactivating layer actually held it, never when
	// focus has since moved elsewhere on the page.
	const lastFocused = useRef<HTMLElement | null>(null)

	useLayoutEffect(() => {
		const deactivating = ready ? placeholderRef.current : contentRef.current

		const activating = ready ? contentRef.current : placeholderRef.current

		const active = document.activeElement

		const heldFocus =
			(!!active && !!deactivating && deactivating.contains(active)) ||
			(active === document.body &&
				!!deactivating &&
				!!lastFocused.current &&
				deactivating.contains(lastFocused.current))

		if (!heldFocus) return

		activating?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
	}, [ready])

	return (
		<ReducedMotion>
			<div
				data-slot="ready-reveal"
				className={cn('grid', className)}
				style={{ gridTemplate: '1fr / 1fr' }}
			>
				<motion.div
					ref={placeholderRef}
					// Track the last focused element per layer (focusin bubbles here),
					// so the effect can tell whether the deactivating layer held focus.
					onFocus={(event) => {
						lastFocused.current = event.target as HTMLElement
					}}
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
					ref={contentRef}
					onFocus={(event) => {
						lastFocused.current = event.target as HTMLElement
					}}
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
