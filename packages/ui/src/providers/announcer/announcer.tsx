'use client'

import { type ReactNode, useCallback, useRef } from 'react'
import { type Announce, AnnouncerContext } from './context'

/**
 * Hosts a single canonical pair of visually-hidden live regions (polite +
 * assertive) and exposes an imperative `announce(message, { assertive })` to
 * descendants via `useAnnounce`. Mount once at the app root, alongside the
 * other root providers — it gives state changes with no natural focus or DOM
 * home a way to reach screen readers (WCAG 4.1.2 / 1.3.1).
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
	const politeRef = useRef<HTMLDivElement>(null)

	const assertiveRef = useRef<HTMLDivElement>(null)

	const announce = useCallback<Announce>((message, { assertive = false } = {}) => {
		const node = assertive ? assertiveRef.current : politeRef.current

		if (!node) return

		// Clear first so re-announcing an identical message still registers as a
		// change; set on the next microtask so the mutation is observed.
		node.textContent = ''

		queueMicrotask(() => {
			node.textContent = message
		})
	}, [])

	return (
		<AnnouncerContext value={announce}>
			{children}

			<div
				ref={politeRef}
				role="status"
				aria-live="polite"
				aria-atomic="true"
				data-slot="live-region"
				className="sr-only"
			/>

			<div
				ref={assertiveRef}
				role="alert"
				aria-live="assertive"
				aria-atomic="true"
				data-slot="live-region"
				className="sr-only"
			/>
		</AnnouncerContext>
	)
}
