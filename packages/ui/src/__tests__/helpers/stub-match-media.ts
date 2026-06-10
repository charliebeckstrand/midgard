import { vi } from 'vitest'

type StubMatchMediaOverrides = Partial<
	Pick<MediaQueryList, 'addEventListener' | 'removeEventListener'>
>

/**
 * Stubs `window.matchMedia` with a deterministic predicate. Returns the spy
 * for call-list assertions; pair with `vi.unstubAllGlobals()` in `afterEach`.
 *
 * Pass `overrides` to share an `addEventListener` / `removeEventListener` spy
 * across every MQL the hook constructs, covering the subscribe-and-cleanup
 * shape used by `useMediaQuery` and similar hooks.
 */
export function stubMatchMedia(
	matches: (query: string) => boolean,
	overrides: StubMatchMediaOverrides = {},
): ReturnType<typeof vi.fn> {
	const impl = vi.fn((query: string) => ({
		matches: matches(query),
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(),
		...overrides,
	}))

	vi.stubGlobal('matchMedia', impl)

	return impl
}
