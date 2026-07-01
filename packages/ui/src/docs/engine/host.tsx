import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { type DemoLoaders, initRegistry } from './registry'

export type { DemoLoaders } from './registry'
export { App }

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
