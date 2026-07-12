'use client'

import { motion } from 'motion/react'
import { Activity, type ReactNode, useLayoutEffect, useRef, useState } from 'react'
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
 *
 * At rest — outside a crossfade — the inactive layer is held in
 * `<Activity mode="hidden">`: kept in the DOM with state preserved, but
 * `display: none`, with its effects torn down, its CSS animations (a
 * skeleton's pulse) stopped, and re-rendering deferred. A rested layer
 * therefore stops contributing to the grid cell's size; a placeholder that
 * mirrors the content's dimensions, as intended, sits flush either way.
 */
export function ReadyReveal({ ready, placeholder, children, className }: ReadyRevealProps) {
	const placeholderRef = useRef<HTMLDivElement>(null)

	const contentRef = useRef<HTMLDivElement>(null)

	// Rest latch: true while no crossfade is in flight, so the inactive layer
	// can be held in a hidden Activity. Cleared in render when `ready` flips
	// (the adjust-state-during-render form) so both layers are live in the same
	// pass the crossfade starts; the deactivating layer's fade-out completion
	// sets it again. Starts true — `initial={false}` means mount plays no
	// entrance, so the inactive layer rests immediately.
	const [settled, setSettled] = useState(true)

	const [previousReady, setPreviousReady] = useState(ready)

	if (previousReady !== ready) {
		setPreviousReady(ready)

		setSettled(false)
	}

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
				<Activity mode={ready && settled ? 'hidden' : 'visible'}>
					<motion.div
						ref={placeholderRef}
						// Track the last focused element per layer (focusin bubbles here),
						// so the effect can tell whether the deactivating layer held focus.
						onFocus={(event) => {
							lastFocused.current = event.target as HTMLElement
						}}
						aria-hidden={ready}
						// `inert` keeps the hidden layer's descendants out of the Tab
						// order and off the a11y tree, and swallows pointer events.
						inert={ready}
						animate={ready ? HIDDEN : VISIBLE}
						initial={false}
						transition={k.transition}
						// Only the deactivating layer's completion rests the crossfade;
						// the guard skips the activating layer's entrance landing.
						onAnimationComplete={() => {
							if (ready) setSettled(true)
						}}
						style={GRID_CELL}
					>
						{placeholder}
					</motion.div>
				</Activity>
				<Activity mode={!ready && settled ? 'hidden' : 'visible'}>
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
						onAnimationComplete={() => {
							if (!ready) setSettled(true)
						}}
						style={GRID_CELL}
					>
						{children}
					</motion.div>
				</Activity>
			</div>
		</ReducedMotion>
	)
}
