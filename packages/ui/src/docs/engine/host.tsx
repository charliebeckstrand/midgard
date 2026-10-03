import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { preloadDebugTools } from './debug/registry'
import { type DemoLoaders, initRegistry } from './registry'

export type { DemoLoaders } from './registry'
export { App }

// Marks a history entry that already recovery-reloaded once. history.state
// survives the reload, so a still-broken boot can't reload again, and a hash
// navigation starts a fresh entry with null state, re-arming recovery.
const RELOADED = 'docs:preload-error-reloaded'

/**
 * Boot a docs site over the given demo loaders. Binds the registry, awaits the
 * chunks of the initial route and of the debug tools that are on, then mounts
 * {@link App} into `rootEl` (or `#root`). The single call the docs-site entry
 * (`src/docs/main.tsx`) makes:
 *
 * ```ts
 * import { mount } from './engine/host'
 *
 * mount(import.meta.glob(['./demos/components/*.tsx', './demos/providers/*.tsx'], { import: 'Demo' }))
 * ```
 *
 * @see The engine README for the entry contract, including why the site's
 *   stylesheet links from `index.html` instead of an import here.
 *
 * @param loaders - The demo loader map from `import.meta.glob`, run in the
 *   consumer so Vite resolves the globs against its own `demos/` tree.
 * @param rootEl - Mount point; defaults to the `#root` element.
 */
export function mount(loaders: DemoLoaders, rootEl?: HTMLElement | null) {
	const root = rootEl ?? document.getElementById('root')

	if (!root) throw new Error('docs: missing #root element')

	// The app scrolls to the top on each route change and on the first render
	// (app.tsx). With `auto`, the browser also restores the last position of the
	// history entry on a reload, on a tab restore, and on the recovery reload
	// below. That restore can occur after the app scrolls to the top, because
	// the demo continues to load. Then the page opens below the top.
	//
	// The mode belongs to one history entry. WebKit gives `auto` to each new
	// entry that a hash link makes, and does not copy the mode of the entry
	// before it. Thus set the mode again on each hash change.
	const manualScrollRestoration = () => {
		history.scrollRestoration = 'manual'
	}

	manualScrollRestoration()

	window.addEventListener('hashchange', manualScrollRestoration)

	// A lazy chunk 404s when a deploy swaps hashed filenames under a long-lived
	// tab; Vite signals it with `vite:preloadError`. Reload once per history
	// entry to pull the new index and its chunk names — hash routing lands the
	// user back on the same demo.
	window.addEventListener('vite:preloadError', () => {
		if (history.state === RELOADED) return

		// An offline failure is transient, not a stale deploy — reloading would
		// trade a degraded-but-working app for the browser's network-error page.
		if (!navigator.onLine) return

		history.replaceState(RELOADED, '')

		window.location.reload()
	})

	const { initialPreload } = initRegistry(loaders)

	// The header paints with the parts of the debug tools that are on.
	Promise.all([initialPreload, preloadDebugTools()])
		.catch(() => {})
		.then(() => {
			createRoot(root).render(
				<StrictMode>
					<App />
				</StrictMode>,
			)
		})
}
