/// <reference types="vite/client" />

import type { ComponentInfo, ComponentMap, ComponentRegistry } from './types'

/**
 * Build a registry from component reference to `{ name, module }` by eagerly
 * importing every component entry point. Returns both an identity-keyed view
 * (for matching rendered React elements) and a name-keyed view (for resolving
 * JSX tag names found inside `__code` snippets).
 */
export function buildComponentRegistry(): ComponentRegistry {
	const byType: ComponentMap = new Map()
	const byName = new Map<string, ComponentInfo>()

	const modules = import.meta.glob<Record<string, unknown>>(
		['../../components/*/index.ts', '../../layouts/index.ts'],
		{ eager: true },
	)

	for (const [path, mod] of Object.entries(modules)) {
		const moduleName =
			path.match(/components\/([^/]+)\//)?.[1] ??
			(path.includes('layouts/index.ts') ? 'layouts' : null) ??
			null

		if (!moduleName) continue

		for (const [name, value] of Object.entries(mod)) {
			if (value == null) continue

			if (!/^[A-Z]/.test(name)) continue

			if (typeof value !== 'function' && typeof value !== 'object') continue

			const info: ComponentInfo = { name, module: moduleName }

			byType.set(value, info)
			byName.set(name, info)
		}
	}

	return { byType, byName }
}

/**
 * Derive a registry from a caller-supplied `ComponentMap`. Used when a custom
 * map is passed to `deriveCode` instead of the eagerly-built default registry.
 */
export function registryFromMap(map: ComponentMap): ComponentRegistry {
	const byName = new Map<string, ComponentInfo>()

	for (const info of map.values()) byName.set(info.name, info)

	return { byType: map, byName }
}
