import { vi } from 'vitest'

type StubMatchMediaOverrides = Partial<
	Pick<MediaQueryList, 'addEventListener' | 'removeEventListener'>
>

/**
 * Build an inert `MediaQueryList` for `query`: every listener method is a
 * `vi.fn()` spy and `matches` is the given verdict. The one shape behind the
 * global jsdom stub (`setup/jsdom-stubs.ts`) and {@link stubMatchMedia}.
 */
export function makeMediaQueryList(
	query: string,
	matches: boolean,
	overrides: StubMatchMediaOverrides = {},
): MediaQueryList {
	return {
		matches,
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(),
		...overrides,
	} as MediaQueryList
}

/**
 * Stubs `window.matchMedia` with a deterministic predicate through
 * `vi.stubGlobal`, so the config's `unstubGlobals` restores the jsdom stub
 * before the next test. Returns the spy for call-list assertions.
 *
 * Pass `overrides` to share an `addEventListener` / `removeEventListener` spy
 * across every MQL the hook constructs, covering the subscribe-and-cleanup
 * shape used by `useMediaQuery` and similar hooks.
 */
export function stubMatchMedia(
	matches: (query: string) => boolean,
	overrides: StubMatchMediaOverrides = {},
): ReturnType<typeof vi.fn> {
	const impl = vi.fn((query: string) => makeMediaQueryList(query, matches(query), overrides))

	vi.stubGlobal('matchMedia', impl)

	return impl
}
