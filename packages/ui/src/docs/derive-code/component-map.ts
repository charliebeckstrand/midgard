import type { ComponentMap } from './types'

/**
 * Build a map from component reference to `{ name, module }` by lazily
 * importing every component entry point. The derivation walker uses this to
 * recognize a React element's `type` and emit the right import line.
 */
export function buildComponentMap(): ComponentMap {
	const map: ComponentMap = new Map()

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

			map.set(value, { name, module: moduleName })
		}
	}

	return map
}
