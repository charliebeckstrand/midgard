import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { type DemoLoaders, initRegistry } from './registry'

export type { DemoLoaders } from './registry'
export { App }

// Timestamp of the last recovery reload; the cooldown caps a persistently broken
// deploy at one reload per window while re-arming recovery for a later one.
const RELOAD_GUARD = 'docs:preload-error-reloaded-at'

const RELOAD_COOLDOWN = 10_000

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
	// tab; Vite signals it with `vite:preloadError`. Reload to pull the new index
	// and its chunk names — hash routing lands the user back on the same demo.
	window.addEventListener('vite:preloadError', () => {
		// Storage can throw when blocked (private mode, sandboxed iframe); without a
		// durable guard a broken chunk would reload forever, so fail closed.
		try {
			const last = Number(sessionStorage.getItem(RELOAD_GUARD))

			if (Date.now() - last < RELOAD_COOLDOWN) return

			sessionStorage.setItem(RELOAD_GUARD, String(Date.now()))
		} catch {
			return
		}

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
