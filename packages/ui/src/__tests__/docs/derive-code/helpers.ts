import type { FunctionComponent } from 'react'
import { defaultRegistry } from '../../../docs/derive-code/registry'
import type { ComponentRegistry, Context } from '../../../docs/derive-code/types'

/**
 * A stand-in component carrying the `__name` / `__module` decoration the
 * `component-tags` Vite plugin attaches to real exports at build time, so the
 * registry's tag reader recognizes it.
 */
export function tag<P>(name: string, module: string): FunctionComponent<P> {
	const Component: FunctionComponent<P> = () => null

	Object.assign(Component, { __name: name, __module: module, displayName: name })

	return Component
}

/**
 * Build a fresh `Context` with an empty import accumulator. `byType` defaults
 * to the production tag reader (`defaultRegistry.byType`) so `tag()` components
 * resolve; pass `byName` to resolve snippet tag names.
 */
export function makeContext(registry?: Partial<ComponentRegistry>): Context {
	return {
		registry: {
			byType: registry?.byType ?? defaultRegistry.byType,
			byName: registry?.byName ?? new Map(),
		},
		imports: new Map(),
	}
}
