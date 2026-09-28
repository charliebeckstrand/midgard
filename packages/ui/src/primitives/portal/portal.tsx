'use client'

import { FloatingPortal } from '@floating-ui/react'
import { AnimatePresence } from 'motion/react'
import { type ReactNode, useEffectEvent, useLayoutEffect, useState } from 'react'
import { ReducedMotion } from '../reduced-motion'
import { type PortalContainer, usePortalContainer } from './context'

/** Props for {@link Portal}. */
export type PortalProps = {
	/**
	 * Whether the surface is open. Drives the enter, and — on the transition to
	 * `false` — the exit animation before the portal node is removed.
	 */
	open: boolean
	/**
	 * Explicit portal container; falls back to the ambient `<UIProvider>` node,
	 * then floating-ui's own root. @see {@link usePortalContainer}
	 */
	container?: PortalContainer
	/** Fires once the exit animation finishes and the portal node unmounts. */
	onExitComplete?: () => void
	/** The open surface, mounted while `open` and kept through its exit animation. */
	children: ReactNode
}

/**
 * Portal + presence mount cell shared by the floating and overlay shells: owns
 * the teleport ({@link usePortalContainer} → `FloatingPortal`), the
 * mount-only-while-open lifecycle, and the `AnimatePresence` exit under
 * {@link ReducedMotion}. Consumers render their own surface as `children`.
 * `Portal` gates it on `open`, so nothing renders while closed and the
 * portal node is removed once the exit completes. A page of N closed surfaces
 * (a filter drawer per grid column, a tooltip per cell) therefore strands no
 * empty `[data-floating-ui-portal]` divs.
 *
 * @remarks Teleports through floating-ui's `FloatingPortal`, not React's
 * `createPortal`. A floating menu opened inside the surface therefore nests in
 * the portal context, rather than being stranded inert by a modal focus
 * manager's `markOthers`. Client-only: returns `null` during SSR.
 *
 * A Suspense boundary or an `<Activity>` above the surface can hide it during its
 * exit. When the boundary reveals it, the exit completes at once, without the
 * animation.
 */
export function Portal({ open, container, onExitComplete, children }: PortalProps) {
	const root = usePortalContainer(container)

	// `mounted` flips on with `open` (adjusted during render) and off once the
	// exit animation completes, so a closed surface keeps no portal node in the DOM.
	const [mounted, setMounted] = useState(open)

	if (open && !mounted) setMounted(true)

	const handleExitComplete = () => {
		setMounted(false)

		onExitComplete?.()
	}

	// A Suspense boundary or an `<Activity>` above the surface can hide it and then
	// reveal it. React runs the layout effects of the subtree again at the reveal, so
	// this effect runs again then. A hide during the exit stops the exit animation. At
	// the reveal, Motion plays the enter animation again, and `AnimatePresence` never
	// calls `onExitComplete`. The closed surface then stays on screen for all time. So
	// a reveal of a closed surface completes the exit here.
	const completeStoppedExit = useEffectEvent(() => {
		if (!open && mounted) handleExitComplete()
	})

	useLayoutEffect(() => {
		completeStoppedExit()
	}, [])

	if (typeof document === 'undefined' || !mounted) return null

	return (
		<FloatingPortal root={root ?? undefined}>
			<ReducedMotion>
				<AnimatePresence onExitComplete={handleExitComplete}>{open && children}</AnimatePresence>
			</ReducedMotion>
		</FloatingPortal>
	)
}
