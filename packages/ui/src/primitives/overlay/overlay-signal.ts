'use client'

/**
 * A listener of the overlay signal. It can give a function that runs when the
 * surface that sent the signal closes.
 */
export type OverlaySignalListener = () => (() => void) | undefined

const listeners = new Set<OverlaySignalListener>()

/**
 * Broadcasts an overlay-lifecycle signal. Each surface that a reader opens on
 * purpose fires it on open. These are an `Overlay` (dialog, sheet, drawer), a
 * popover, and a menu (the `signal` option of `useFloatingDisclosure`).
 * Non-modal floats such as tooltips subscribe and close on any signal. Carries
 * no payload.
 *
 * @returns A function that the surface calls one time, when it closes. It runs
 * the functions that the listeners gave for this signal, so a tooltip that the
 * surface hid can open again.
 */
export function notifyOverlaySignal(): () => void {
	const onCloses: (() => void)[] = []

	// A copy of the set: a listener that subscribes or unsubscribes during the
	// call changes the next signal, not this one.
	for (const listener of [...listeners]) {
		const onClose = listener()

		if (onClose) onCloses.push(onClose)
	}

	return () => {
		for (const onClose of onCloses) onClose()
	}
}

/**
 * Subscribes to the overlay-lifecycle signal; the listener fires whenever any
 * surface opens. Non-modal floats (tooltips) use it to close when a modal
 * surface takes over. A listener can give a function that runs when that
 * surface closes.
 *
 * @returns An unsubscribe function that removes the listener. It does not stop
 * a function that the listener gave for an earlier signal.
 * @see {@link notifyOverlaySignal}
 */
export function subscribeOverlaySignal(listener: OverlaySignalListener): () => void {
	listeners.add(listener)

	return () => {
		listeners.delete(listener)
	}
}
