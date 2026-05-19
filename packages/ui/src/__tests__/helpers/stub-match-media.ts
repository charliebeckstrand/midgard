import { vi } from 'vitest'

type StubMatchMediaOverrides = Partial<
	Pick<MediaQueryList, 'addEventListener' | 'removeEventListener'>
>

/**
 * Stub `window.matchMedia` so a hook that reads it during render or as a
 * module-level effect resolves against a deterministic predicate. Hand the
 * returned spy back if a test needs to assert against the call list; pair
 * with `vi.unstubAllGlobals()` in `afterEach`.
 *
 * Pass `overrides` to share an `addEventListener` / `removeEventListener`
 * spy across every MQL the hook constructs — the subscribe-and-cleanup
 * shape that `useMediaQuery` and friends rely on.
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
