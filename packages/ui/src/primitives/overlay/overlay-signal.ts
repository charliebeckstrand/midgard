'use client'

type Listener = () => void

const listeners = new Set<Listener>()

/**
 * Broadcasts an overlay-lifecycle signal. Modal-style surfaces (dialog,
 * sheet, drawer, popover) fire it on open; non-modal floats such as
 * tooltips subscribe and close on any signal. Carries no payload.
 */
export function notifyOverlaySignal(): void {
	for (const listener of listeners) listener()
}

/**
 * Subscribes to the overlay-lifecycle signal; the listener fires whenever any
 * surface opens. Returns an unsubscribe function. Non-modal floats (tooltips)
 * use it to close when a modal surface takes over.
 */
export function subscribeOverlaySignal(listener: Listener): () => void {
	listeners.add(listener)

	return () => {
		listeners.delete(listener)
	}
}
