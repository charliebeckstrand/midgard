/// <reference path="../virtual-modules.d.ts" />

import componentModules from 'virtual:component-modules'
import type { ComponentInfo, ComponentRegistry } from './types'

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
 * Default (and only) registry. `byType` reads tags lazily off each element's
 * type, so components load with the demos that use them. `byName` is the
 * build-time module map used to resolve JSX tag names found in raw `__code`
 * snippets back to their import paths.
 */
export const defaultRegistry: ComponentRegistry = {
	byType: { get: readTag },
	byName,
}
