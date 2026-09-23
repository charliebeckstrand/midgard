import { vi } from 'vitest'
import { noop } from './noop'

type StubMatchMediaOverrides = Partial<
	Pick<MediaQueryList, 'addEventListener' | 'removeEventListener'>
>

/**
 * Build an inert `MediaQueryList` for `query`: every listener method is a
 * {@link noop} and `matches` is the given verdict. The one shape behind the
 * global jsdom stub (`setup/jsdom-stubs.ts`) and {@link stubMatchMedia}.
 *
 * The methods are not `vi.fn()` spies. Every render that reads a media query
 * builds a list, and Vitest keeps each `vi.fn()` in one registry for the life
 * of the worker. Under `isolate: false` that registry grows across every file
 * the worker runs, and `clearMocks` walks all of it before each test. Five
 * spies for each list made that walk a quarter of the `unit` project's CPU
 * time. A case that asserts on a listener passes its own spy in `overrides`.
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
		addEventListener: noop,
		removeEventListener: noop,
		addListener: noop,
		removeListener: noop,
		dispatchEvent: () => false,
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
