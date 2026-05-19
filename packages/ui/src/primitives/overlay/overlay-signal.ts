'use client'

type Listener = () => void

const listeners = new Set<Listener>()

/**
 * Notify subscribers that a modal overlay (dialog, sheet, drawer, popover)
 * has opened. Tooltips subscribe so a tap on a tooltip-wrapped trigger
 * doesn't strand the tooltip above the new overlay.
 */
export function notifyOverlayOpened(): void {
	for (const listener of listeners) listener()
}

export function subscribeOverlayOpened(listener: Listener): () => void {
	listeners.add(listener)

	return () => {
		listeners.delete(listener)
	}
}
