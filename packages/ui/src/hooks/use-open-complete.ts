'use client'

import { useCallback, useRef } from 'react'

/**
 * Reports a panel's arrival exactly once, for a surface that animates it. The element
 * either mounts and unmounts with the open state (`PresencePortal`), or stays mounted and
 * animates in place. A held `Collapse` or `Accordion` panel is the second kind.
 *
 * Two things make the report awkward enough to share. The reset happens while the panel is
 * closed rather than when the arrival is reported. A reopen therefore reports again, while
 * a second landing inside one arrival does not. The state is adjusted during render, in
 * step with {@link useEnterAnimation}. And the exit animation lands on the same
 * `onAnimationComplete` the enter does. The leaving subtree keeps the props from the render
 * where the panel was still open. The open flag therefore cannot tell the two apart. What
 * the motion library hands back can: the preset's own `animate` object on the way in, its
 * `exit` on the way out.
 *
 * @param open Current open state, as handed to the presence gate.
 * @param arrival The active preset's `animate` target, compared by identity. Presets are
 * module constants, so the identity holds.
 * @param onOpenComplete The caller's callback, raised once per arrival.
 * @returns `onAnimationComplete` to spread onto the animated element, plus `report`. A
 * panel that can arrive with no animation to land (Drawer's `animateOnMount={false}`) uses
 * `report` to say so from an effect.
 * @internal
 */
export function useOpenComplete(
	open: boolean,
	arrival: unknown,
	onOpenComplete?: () => void,
): { report: () => void; onAnimationComplete: (definition: unknown) => void } {
	const reportedRef = useRef(false)

	if (!open) reportedRef.current = false

	// A ref rather than `useEffectEvent`, which returns a fresh function per render: `report`
	// escapes into a caller's dependency array (Drawer's arrival effect), so it must be one
	// identity for the mount. The ref also spares a caller that binds a payload — an
	// accordion section naming itself — from memoizing a callback only Drawer reads.
	const onOpenCompleteRef = useRef(onOpenComplete)

	onOpenCompleteRef.current = onOpenComplete

	// Stable for the mount: Drawer's arrival effect depends on its identity.
	const report = useCallback(() => {
		if (reportedRef.current) return

		reportedRef.current = true

		onOpenCompleteRef.current?.()
	}, [])

	return {
		report,
		onAnimationComplete: (definition) => {
			if (definition === arrival) report()
		},
	}
}
