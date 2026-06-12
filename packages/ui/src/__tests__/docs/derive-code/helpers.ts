import type { FunctionComponent } from 'react'
import { defaultRegistry } from '../../../docs/derive-code/registry'
import type { ComponentRegistry, Context } from '../../../docs/derive-code/types'

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
 * Builds a fresh `Context` with an empty import accumulator. `byType` defaults
 * to the production tag reader (`defaultRegistry.byType`), resolving `tag()`
 * components; pass `byName` to resolve snippet tag names and `external()`
 * components.
 */
export function makeContext(registry?: Partial<ComponentRegistry>): Context {
	return {
		registry: {
			byType: registry?.byType ?? defaultRegistry.byType,
			byName: registry?.byName ?? new Map(),
		},
		imports: new Map(),
		externalModules: new Set(),
	}
}
