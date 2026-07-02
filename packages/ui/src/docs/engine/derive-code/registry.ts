/// <reference path="../virtual-modules.d.ts" />

import componentModules from 'virtual:component-modules'
import type { ComponentInfo, ComponentRegistry } from './types'

type Tagged = { __module?: string; __name?: string }

/**
 * Read the `__module` / `__name` decoration attached by the docs Vite
 * plugin's barrel transform. Returns `undefined` for built-ins, demo-local
 * helpers, or any function without a build-time tag.
 *
 * @remarks Exported so agnostic-engine tests can assemble a synthetic
 * {@link ComponentRegistry} (the real tag reader + their own `byName` map) and
 * pass it into `deriveCode`, instead of `vi.mock`-ing `virtual:component-modules`
 * — a module-level mock that bleeds across files under the shared-worker
 * `vmThreads` pool and corrupts the real-registry integration test.
 */
export function readTag(type: unknown): ComponentInfo | undefined {
	if (type == null) return undefined

	const { __module, __name } = type as Tagged

	if (typeof __module !== 'string' || typeof __name !== 'string') return undefined

	return { name: __name, module: __module }
}

const byName = new Map<string, ComponentInfo>(
	Object.entries(componentModules.names).map(([name, entry]) => [
		name,
		typeof entry === 'string'
			? { name, module: entry }
			: { name, module: entry.module, external: true },
	]),
)

/**
 * Default (and only) registry. `byType` reads tags lazily off each element's
 * type, loading components alongside the demos that use them. `byName` is the
 * build-time module map resolving JSX tag names in raw `__code` snippets to
 * their import paths. `packageName` is the documented library's import prefix,
 * baked in at build time by the docs plugin.
 */
export const defaultRegistry: ComponentRegistry = {
	byType: { get: readTag },
	byName,
	packageName: componentModules.packageName,
}
