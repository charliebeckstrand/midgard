import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { type DemoLoaders, initRegistry } from './registry'

export type { DemoLoaders } from './registry'
export { App }

// Marks a history entry that already recovery-reloaded once. history.state
// survives the reload, so a still-broken boot can't reload again, and a hash
// navigation starts a fresh entry with null state, re-arming recovery.
const RELOADED = 'docs:preload-error-reloaded'

/**
 * Boot a docs site over the given demo loaders. Binds the registry, awaits the
 * initial route's chunk, then mounts {@link App} into `rootEl` (or `#root`).
 * The single call the docs-site entry (`src/docs/main.tsx`) makes:
 *
 * ```ts
 * import { mount } from './engine/host'
 * import './app.css'
 *
 * mount(import.meta.glob(['./demos/components/*.tsx', './demos/providers/*.tsx'], { import: 'Demo' }))
 * ```
 *
 * @param loaders - The demo loader map from `import.meta.glob`, run in the
 *   consumer so Vite resolves the globs against its own `demos/` tree.
 * @param rootEl - Mount point; defaults to the `#root` element.
 */
export function mount(loaders: DemoLoaders, rootEl?: HTMLElement | null) {
	const root = rootEl ?? document.getElementById('root')

	if (!root) throw new Error('docs: missing #root element')

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

	initialPreload
		.catch(() => {})
		.then(() => {
			createRoot(root).render(
				<StrictMode>
					<App />
				</StrictMode>,
			)
		})
}
