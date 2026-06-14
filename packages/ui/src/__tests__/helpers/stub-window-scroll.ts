import { vi } from 'vitest'

/**
 * Replaces `window.scrollBy` with a no-op spy. jsdom defines the method but logs
 * a "Not implemented" jsdomError on every call (it has no layout engine), so any
 * window-scrolling code — e.g. the scroll-area scrollbar track fallback — trips
 * it. Applied globally in `setup/jsdom-stubs.ts`; import it in a test to get the
 * spy for call-list assertions. Returns the spy.
 */
export function stubWindowScrollBy(): ReturnType<typeof vi.fn> {
	const impl = vi.fn()

	Object.defineProperty(window, 'scrollBy', { writable: true, configurable: true, value: impl })

	return impl
}
