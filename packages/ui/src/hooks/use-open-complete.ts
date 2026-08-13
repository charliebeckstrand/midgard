'use client'

import { useCallback, useRef } from 'react'

/**
 * Reports a panel's arrival exactly once, for a surface whose animated element mounts and
 * unmounts with its open state (`PresencePortal`).
 *
 * Two things make the report awkward enough to share. The reset happens while the panel is
 * closed rather than when the arrival is reported, so a reopen reports again while a second
 * landing inside one arrival does not — adjusted during render, in step with
 * {@link useEnterAnimation}. And the exit animation lands on the same `onAnimationComplete`
 * the enter does, while the leaving subtree keeps the props from the render where the panel
 * was still open, so the open flag cannot tell the two apart. What the motion library hands
 * back can: the preset's own `animate` object on the way in, its `exit` on the way out.
 *
 * @param open Current open state, as handed to the presence gate.
 * @param arrival The active preset's `animate` target, compared by identity. Presets are
 * module constants, so the identity holds.
 * @param onOpenComplete The caller's callback, raised once per arrival.
 * @returns `onAnimationComplete` to spread onto the animated element, plus `report` for a
 * panel that can arrive with no animation to land (Drawer's `animateOnMount={false}`) and
 * has to say so from an effect instead.
 * @internal
 */
export function useOpenComplete(
	open: boolean,
	arrival: unknown,
	onOpenComplete?: () => void,
): { report: () => void; onAnimationComplete: (definition: unknown) => void } {
	const reportedRef = useRef(false)

	if (!open) reportedRef.current = false

	// Memoized: Drawer's arrival effect depends on it, and a bare function would change
	// identity every render, which `useExhaustiveDependencies` rejects outright.
	const report = useCallback(() => {
		if (reportedRef.current) return

		reportedRef.current = true

		onOpenComplete?.()
	}, [onOpenComplete])

	return {
		report,
		onAnimationComplete: (definition) => {
			if (definition === arrival) report()
		},
	}
}
