'use client'

import { FloatingPortal } from '@floating-ui/react'
import { AnimatePresence } from 'motion/react'
import { type ReactNode, useState } from 'react'
import { ReducedMotion } from '../reduced-motion'
import { type PortalContainer, usePortalContainer } from './portal'

/** Props for {@link PresencePortal}. */
export type PresencePortalProps = {
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
 * {@link ReducedMotion}. Consumers render their own surface as `children`;
 * `PresencePortal` gates it on `open`, so nothing renders while closed and the
 * portal node is removed once the exit completes — a page of N closed surfaces
 * (a filter drawer per grid column, a tooltip per cell) strands no empty
 * `[data-floating-ui-portal]` divs.
 *
 * @remarks Teleports through floating-ui's `FloatingPortal` (not React's
 * `createPortal`) so a floating menu opened inside the surface nests in the
 * portal context rather than being stranded inert by a modal focus manager's
 * `markOthers`. Client-only: returns `null` during SSR.
 */
export function PresencePortal({ open, container, onExitComplete, children }: PresencePortalProps) {
	const root = usePortalContainer(container)

	// `mounted` flips on with `open` (adjusted during render) and off once the
	// exit animation completes, so a closed surface keeps no portal node in the DOM.
	const [mounted, setMounted] = useState(open)

	if (open && !mounted) setMounted(true)

	if (typeof document === 'undefined') return null

	if (!mounted) return null

	const handleExitComplete = () => {
		setMounted(false)

		onExitComplete?.()
	}

	return (
		<FloatingPortal root={root ?? undefined}>
			<ReducedMotion>
				<AnimatePresence onExitComplete={handleExitComplete}>{open && children}</AnimatePresence>
			</ReducedMotion>
		</FloatingPortal>
	)
}
