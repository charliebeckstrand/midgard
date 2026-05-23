'use client'

type Listener = () => void

const listeners = new Set<Listener>()

/**
 * Broadcast an overlay-lifecycle signal. Modal-style surfaces (dialog,
 * sheet, drawer, popover) fire it when they open so non-modal floats —
 * tooltips today — can drop themselves before being stranded above the
 * new overlay. Carries no payload; the only current consumer treats any
 * signal as "close yourself." The generic name leaves room to extend
 * later without renaming.
 */
export function notifyOverlaySignal(): void {
	for (const listener of listeners) listener()
}

export function subscribeOverlaySignal(listener: Listener): () => void {
	listeners.add(listener)

	return () => {
		listeners.delete(listener)
	}
}
