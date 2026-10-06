import { describe, expect, it } from 'vitest'
import { liveGlobalListeners } from './global-listeners'

/** The live listeners on `window` for one event type. */
function onWindow(type: string) {
	return [...liveGlobalListeners()].filter(
		(entry) => entry.target === 'window' && entry.type === type,
	)
}

describe('the global listener record', () => {
	// Vitest gives the jsdom global its own bound copy of each window method,
	// so a wrap of `EventTarget.prototype` alone never sees these calls.
	it('records a listener that a test adds to window, until the test removes it', () => {
		const listener = () => {}

		window.addEventListener('pointerup', listener, true)

		expect(onWindow('pointerup')).toEqual([expect.objectContaining({ capture: true })])

		window.removeEventListener('pointerup', listener, true)

		expect(onWindow('pointerup')).toEqual([])
	})

	it('records a listener that a bare call adds to the global object', () => {
		const listener = () => {}

		globalThis.addEventListener('pointercancel', listener)

		expect(onWindow('pointercancel')).toHaveLength(1)

		globalThis.removeEventListener('pointercancel', listener)

		expect(onWindow('pointercancel')).toEqual([])
	})

	it('records a once listener until its event fires', () => {
		const listener = () => {}

		window.addEventListener('pagehide', listener, { once: true })

		expect(onWindow('pagehide')).toHaveLength(1)

		window.dispatchEvent(new Event('pagehide'))

		expect(onWindow('pagehide')).toEqual([])
	})

	it('drops a once listener that a test removes before its event', () => {
		const listener = () => {}

		document.addEventListener('focusin', listener, { once: true })

		expect([...liveGlobalListeners()].filter((entry) => entry.type === 'focusin')).toHaveLength(1)

		document.removeEventListener('focusin', listener)

		expect([...liveGlobalListeners()].filter((entry) => entry.type === 'focusin')).toEqual([])
	})
})
