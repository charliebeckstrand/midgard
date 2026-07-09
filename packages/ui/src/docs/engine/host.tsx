import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { initRegistry, type MountInput, preloadCurrentRoute, resolveLegacyHash } from './registry'
import { stripBase, withBase } from './router'

export type { DemoLoaders, LayoutLoaders, MountInput } from './registry'
export { App }

// Old bookmarks used hash routes (`/#modules-grid`). At the root with a hash
// naming a demo, rewrite to the path route before the initial preload reads
// the location; elsewhere the hash is an example anchor and stays.
function redirectLegacyHash() {
	const atRoot = ['', '/'].includes(stripBase(window.location.pathname))

	if (!atRoot || !window.location.hash) return

	const href = resolveLegacyHash(window.location.hash)

	if (href) history.replaceState(null, '', withBase(href))
}

/**
 * Boot a docs site over the given demo and layout loaders. Binds the registry,
 * rewrites any legacy hash route, awaits the initial route's chunks, then
 * mounts {@link App} into `rootEl` (or `#root`). The single call the docs-site
 * entry (`src/docs/main.tsx`) makes, passing a recursive `import.meta.glob`
 * over `demos/` (excluding `layout.tsx` and `_`-prefixed helpers) as `demos`
 * and a `layout.tsx` glob as `layouts` — see `main.tsx` for the exact patterns.
 *
 * @param input - The demo and layout loader maps from `import.meta.glob`, run
 *   in the consumer so Vite resolves the globs against its own `demos/` tree.
 * @param rootEl - Mount point; defaults to the `#root` element.
 */
export function mount(input: MountInput, rootEl?: HTMLElement | null) {
	const root = rootEl ?? document.getElementById('root')

	if (!root) throw new Error('docs: missing #root element')

	initRegistry(input)

	redirectLegacyHash()

	preloadCurrentRoute()
		.catch(() => {})
		.then(() => {
			createRoot(root).render(
				<StrictMode>
					<App />
				</StrictMode>,
			)
		})
}
