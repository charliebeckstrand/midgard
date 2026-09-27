'use client'

import { createEmitter } from '../../utilities'

const signal = createEmitter()

/**
 * Broadcasts an overlay-lifecycle signal. Modal-style surfaces (dialog,
 * sheet, drawer, popover) fire it on open; non-modal floats such as
 * tooltips subscribe and close on any signal. Carries no payload.
 */
export function notifyOverlaySignal(): void {
	signal.emit()
}

/**
 * Subscribes to the overlay-lifecycle signal; the listener fires whenever any
 * surface opens. Non-modal floats (tooltips) use it to close when a modal
 * surface takes over.
 *
 * @returns An unsubscribe function that removes the listener.
 * @see {@link notifyOverlaySignal}
 */
export function subscribeOverlaySignal(listener: () => void): () => void {
	return signal.subscribe(listener)
}
