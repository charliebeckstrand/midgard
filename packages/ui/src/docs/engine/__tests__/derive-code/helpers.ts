import type { FunctionComponent } from 'react'
import { defaultRegistry } from '../../derive-code/registry'
import type { ComponentRegistry, Context } from '../../derive-code/types'

/**
 * A stand-in component carrying the `__name` / `__module` decoration the
 * `component-tags` Vite plugin attaches to real exports at build time.
 * The registry's tag reader recognizes it identically to a real export.
 */
export function tag<P>(name: string, module: string): FunctionComponent<P> {
	const Component: FunctionComponent<P> = () => null

	Object.assign(Component, { __name: name, __module: module, displayName: name })

	return Component
}

/**
 * A stand-in for an external package component (e.g. a lucide icon): no
 * build-time tag, only the runtime `displayName` the resolver matches against
 * external `byName` entries.
 */
export function external<P>(name: string): FunctionComponent<P> {
	const Component: FunctionComponent<P> = () => null

	Component.displayName = name

	return Component
}

/**
 * A stand-in for a demo-local helper component, carrying the `__code` source
 * the docs plugin's `pre` transform attaches. It has no build-time tag, so the
 * walk renders `code` verbatim and reads the snippet's imports from it.
 */
export function snippet<P>(code: string): FunctionComponent<P> {
	const Component: FunctionComponent<P> = () => null

	Object.assign(Component, { __code: code })

	return Component
}

/**
 * Builds a fresh `Context` with an empty import accumulator. `byType` defaults
 * to the production tag reader (`defaultRegistry.byType`), resolving `tag()`
 * components; pass `byName` to resolve snippet tag names and `external()`
 * components.
 */
export function makeContext(registry?: Partial<ComponentRegistry>): Context {
	const packageName = registry?.packageName ?? 'ui'

	return {
		registry: {
			byType: registry?.byType ?? defaultRegistry.byType,
			byName: registry?.byName ?? new Map(),
			packageName,
		},
		imports: new Map(),
		externalModules: new Set(),
		packageName,
		factTexts: [],
		pulledDecls: new Set(),
	}
}
