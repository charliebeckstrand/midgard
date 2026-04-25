/// <reference path="../virtual-modules.d.ts" />

import componentModules from 'virtual:component-modules'
import type { ComponentInfo, ComponentMap, ComponentRegistry } from './types'

type Tagged = { __module?: string; __name?: string }

/**
 * Read the `__module` / `__name` decoration attached by the `component-tags`
 * Vite plugin. Returns `undefined` for built-ins, demo-local helpers, or any
 * function that wasn't tagged at build time.
 */
function readTag(type: unknown): ComponentInfo | undefined {
	if (type == null) return undefined

	const { __module, __name } = type as Tagged

	if (typeof __module !== 'string' || typeof __name !== 'string') return undefined

	return { name: __name, module: __module }
}

const byName = new Map<string, ComponentInfo>(
	Object.entries(componentModules).map(([name, module]) => [name, { name, module }] as const),
)

/**
 * Default registry — `byType` reads tags lazily from each element's type,
 * so components only load when the demos that use them load. `byName` is a
 * static map computed at build time for snippet-import resolution.
 */
export const defaultRegistry: ComponentRegistry = {
	byType: { get: readTag },
	byName,
}

/**
 * Derive a registry from a caller-supplied `ComponentMap`. Used when a custom
 * map is passed to `deriveCode` instead of the default registry.
 */
export function registryFromMap(map: ComponentMap): ComponentRegistry {
	const byName = new Map<string, ComponentInfo>()

	for (const info of map.values()) byName.set(info.name, info)

	return { byType: map, byName }
}
