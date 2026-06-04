'use client'

import { useCallback, useEffect } from 'react'

type AnnounceOptions = {
	/** Use an assertive live region for time-sensitive messages. @default false (polite) */
	assertive?: boolean
}

type Announce = (message: string, options?: AnnounceOptions) => void

// Standard visually-hidden styling — read by assistive tech, never painted.
const VISUALLY_HIDDEN =
	'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;'

type Regions = { polite: HTMLElement; assertive: HTMLElement }

// A single shared region pair, ref-counted across every useAnnounce caller.
// Persistent regions announce reliably (unlike ones created at announce time),
// and sharing them avoids littering the document with one pair per component.
let regions: Regions | null = null

let refCount = 0

function createRegion(politeness: 'polite' | 'assertive'): HTMLElement {
	const el = document.createElement('div')

	el.setAttribute('aria-live', politeness)
	el.setAttribute('aria-atomic', 'true')
	el.setAttribute('role', politeness === 'assertive' ? 'alert' : 'status')
	el.setAttribute('data-slot', 'live-region')
	el.style.cssText = VISUALLY_HIDDEN

	document.body.appendChild(el)

	return el
}

function acquire(): void {
	refCount += 1

	if (!regions) {
		regions = { polite: createRegion('polite'), assertive: createRegion('assertive') }
	}
}

function release(): void {
	refCount -= 1

	if (refCount <= 0) {
		refCount = 0

		regions?.polite.remove()

		regions?.assertive.remove()

		regions = null
	}
}

/**
 * Imperatively announce a message to screen readers through a shared,
 * persistent visually-hidden live region — for state changes that have no
 * natural focus or DOM home (copy succeeded, item removed, results filtered).
 *
 * Returns a stable `announce(message, { assertive })` function. Polite by
 * default; pass `{ assertive: true }` for time-sensitive interruptions. No
 * provider or app wiring is required — the region mounts on first use.
 */
export function useAnnounce(): Announce {
	useEffect(() => {
		acquire()

		return release
	}, [])

	return useCallback((message: string, { assertive = false }: AnnounceOptions = {}) => {
		const target = assertive ? regions?.assertive : regions?.polite

		if (!target) return

		// Clear first so re-announcing an identical message still registers as a
		// change; set on the next microtask so the mutation is observed.
		target.textContent = ''

		queueMicrotask(() => {
			target.textContent = message
		})
	}, [])
}
