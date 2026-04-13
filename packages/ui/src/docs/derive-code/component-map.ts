import type { ComponentMap } from './types'

/**
 * Build a map from component reference to `{ name, module }` by lazily
 * importing every component entry point. The derivation walker uses this to
 * recognize a React element's `type` and emit the right import line.
 *
 * Both `components/*` and `pages/*` are included so that demos that render
 * higher-level page compositions still get useful derivation.
 */
export async function buildComponentMap(): Promise<ComponentMap> {
	const map: ComponentMap = new Map()

	const loaders = import.meta.glob<Record<string, unknown>>([
		'../../components/*/index.ts',
		'../../pages/index.ts',
		'../../layouts/index.ts',
	])

	const entries = await Promise.all(
		Object.entries(loaders).map(async ([path, loader]) => [path, await loader()] as const),
	)

	for (const [path, mod] of entries) {
		const moduleName =
			path.match(/components\/([^/]+)\//)?.[1] ??
			path.match(/(pages|layouts)\/index\.ts/)?.[1] ??
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
