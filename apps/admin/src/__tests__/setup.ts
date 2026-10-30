/**
 * Stubs for the browser APIs that jsdom does not have.
 *
 * jsdom has no `matchMedia`, and ui reads media queries as it renders. The
 * stub matches no query. A case that does not read a query also needs the
 * stub: `UIProvider` loads some modules in idle time, one second after the
 * mount in jsdom, and renders their parts closed. A case that runs longer than
 * that, such as on a busy machine, then renders a closed dialog, which reads
 * the width of the viewport.
 */
if (typeof window.matchMedia !== 'function') {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		configurable: true,
		value: (query: string): MediaQueryList =>
			({
				matches: false,
				media: query,
				onchange: null,
				addEventListener: () => {},
				removeEventListener: () => {},
				addListener: () => {},
				removeListener: () => {},
				dispatchEvent: () => false,
			}) as MediaQueryList,
	})
}
