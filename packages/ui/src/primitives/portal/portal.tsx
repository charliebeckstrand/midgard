'use client'

import { FloatingPortal } from '@floating-ui/react'
import { AnimatePresence } from 'motion/react'
import { type ReactNode, useEffectEvent, useId, useLayoutEffect, useState } from 'react'
import { useHydrated } from '../../hooks/use-hydrated'
import { useDensityScope } from '../density'
import { useDirectionScope } from '../direction'
import { ReducedMotion } from '../reduced-motion'
import { type PortalContainer, PortalScopeContext, usePortalContainer } from './context'

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
	/**
	 * Whether a surface that is open in the server render is part of the page.
	 * The portal then renders it in place on the server and in the hydration
	 * render, so it paints with the server HTML. After hydration, it moves into
	 * the portal at rest, with no enter animation. Each later open plays the
	 * enter, and each close plays the exit.
	 *
	 * Only a surface that needs no measurement to place itself can paint before
	 * hydration. An overlay covers its frame, and a floating surface waits for its
	 * anchor.
	 *
	 * Two things in the caller can still keep the surface out of the first paint.
	 * A Suspense boundary above it that waits on the server sends it after the
	 * shell, in a hidden segment, and React shows it in a later frame. A surface
	 * after heavy content in the document can miss a paint of a document that the
	 * browser has not parsed to the end. Thus put no boundary above a surface that
	 * opens on the server, and put the surface before heavy content.
	 * @defaultValue false
	 */
	ssr?: boolean
	/** Fires once the exit animation finishes and the portal node unmounts. */
	onExitComplete?: () => void
	/** The open surface, mounted while `open` and kept through its exit animation. */
	children: ReactNode
}

/**
 * Opens the portal scope of one mounted portal. A closed portal renders no
 * scope, so it holds no id.
 *
 * @internal
 */
function PortalScope({ children }: { children: ReactNode }) {
	const scope = useId()

	return <PortalScopeContext value={scope}>{children}</PortalScopeContext>
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
 * manager's `markOthers`. Returns `null` on the server, except for an open
 * surface with `ssr` set.
 *
 * The teleport takes the surface out of the DOM subtree of the place that
 * opened it, so the attributes that cascade through the DOM do not reach it.
 * Portal therefore renders one host, `data-slot="portal"` with
 * `display: contents`, around the surface. The host writes the step of the
 * nearest density scope as `data-density` and the direction of the nearest
 * direction scope as `dir`. Outside a scope it writes nothing, and the surface
 * follows the root element. A host never makes a box, so it changes no
 * layout or positioning.
 *
 * Each portal also opens a portal scope (`usePortalScope`). A context that a
 * surface keeps to itself ends there, such as the button defaults of an alert.
 *
 * A pnpm patch of `@floating-ui/react` keeps the portal node when an
 * `<Activity>` hides the surface, so the reveal does not remount it
 * (`overlay-activity-hold.test.tsx`). Remove the patch only when the upstream
 * portal keeps its node, or when the package vendors the portal and the focus
 * manager together. The focus manager reads the portal context for the Tab
 * order, so a vendored portal alone breaks that order.
 *
 * A Suspense boundary or an `<Activity>` above the surface can hide it during its
 * exit. When the boundary reveals it, the exit completes at once, without the
 * animation.
 */
export function Portal({ open, container, ssr = false, onExitComplete, children }: PortalProps) {
	const root = usePortalContainer(container)

	const density = useDensityScope()

	const dir = useDirectionScope()

	// `mounted` flips on with `open` (adjusted during render) and off once the
	// exit animation completes, so a closed surface keeps no portal node in the DOM.
	const [mounted, setMounted] = useState(open)

	if (open && !mounted) setMounted(true)

	// `false` on the server and in the hydration render. No portal exists then.
	const hydrated = useHydrated()

	// Whether the next entrance is a restore, which plays no enter: a surface that
	// the page painted, first in place and then in the portal. Only the first
	// entrance can be: the closed portal unmounts its `AnimatePresence`, so each
	// open mounts a new one, and `initial` reads only at that mount.
	const [restore, setRestore] = useState(ssr && open && !hydrated)

	const handleExitComplete = () => {
		setMounted(false)

		setRestore(false)

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

	if (!mounted || (!hydrated && !ssr)) return null

	const surface = (
		<div
			data-slot="portal"
			data-h={String(hydrated)}
			data-density={density ?? undefined}
			dir={dir ?? undefined}
			className="contents"
		>
			<PortalScope>
				<ReducedMotion>
					<AnimatePresence initial={!restore} onExitComplete={handleExitComplete}>
						{open && children}
					</AnimatePresence>
				</ReducedMotion>
			</PortalScope>
		</div>
	)

	// In place until hydration. The move remounts the surface, which is still at rest.
	if (!hydrated) return surface

	return <FloatingPortal root={root ?? undefined}>{surface}</FloatingPortal>
}
