'use client'

import { Children, type ReactNode } from 'react'
import { buildComponentMap } from './component-map'
import type { ComponentMap, Ctx } from './types'
import { renderNodes } from './walk'

export type { ComponentInfo, ComponentMap } from './types'

// Eagerly construct the default map at module load. The glob is Vite-specific,
// so tests that want to exercise `deriveCode` in isolation can pass their own
// map via the second argument.
const DEFAULT_MAP: ComponentMap = buildComponentMap()

/**
 * Walk a React children tree and produce a simplified code block showing how
 * to use the components on display.
 *
 * - Styling wrappers (divs, spans, Fragments) are transparently skipped.
 * - Pure text/number children collapse to `…`.
 * - Iterated siblings surface as a `const plural = [...]` declaration plus a
 *   single representative element, so loops disappear from the output.
 * - Imports are collected automatically from the component map.
 *
 * Returns `null` when the subtree contains no recognized components — the
 * caller should then either provide an explicit `code` override or omit the
 * code block entirely.
 */
export function deriveCode(children: ReactNode, map: ComponentMap = DEFAULT_MAP): string | null {
	const ctx: Ctx = {
		map,
		imports: new Map(),
		consts: [],
		constNames: new Set(),
	}

	const jsx = renderNodes(Children.toArray(children), ctx, '')

	if (ctx.imports.size === 0) return null

	return assemble(ctx, jsx)
}

function assemble(ctx: Ctx, jsx: string): string {
	const sections: string[] = []

	const imports = [...ctx.imports.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([mod, names]) => `import { ${[...names].sort().join(', ')} } from 'ui/${mod}'`)

	sections.push(imports.join('\n'))

	if (ctx.consts.length > 0) {
		sections.push(
			ctx.consts.map(({ name, values }) => `const ${name} = [${values.join(', ')}]`).join('\n'),
		)
	}

	if (jsx) sections.push(jsx)

	return sections.join('\n\n')
}
