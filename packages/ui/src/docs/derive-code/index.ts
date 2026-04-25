'use client'

import { Children, type ReactNode } from 'react'
import { buildComponentRegistry, registryFromMap } from './registry'
import type { ComponentMap, Ctx } from './types'
import { renderNodes } from './walk'

export type { ComponentInfo, ComponentMap } from './types'

// Built eagerly and synchronously at module load.
const defaultRegistry = buildComponentRegistry()

/**
 * Walk a React children tree and produce a simplified code block showing how
 * to use the components on display.
 *
 * - Styling wrappers (divs, spans, Fragments) are transparently skipped.
 * - Pure text/number children collapse to `…`.
 * - Runs of 3+ identical sibling renders collapse to a single representative
 *   so loops don't dominate the output.
 * - Imports are collected automatically from the component map.
 *
 * Returns `null` when the subtree contains no recognized components — the
 * caller should then either provide an explicit `code` override or omit the
 * code block entirely.
 */
export function deriveCode(children: ReactNode, map?: ComponentMap): string | null {
	const ctx: Ctx = {
		registry: map ? registryFromMap(map) : defaultRegistry,
		imports: new Map(),
	}

	const jsx = renderNodes(Children.toArray(children), ctx, '')

	if (ctx.imports.size === 0) return null

	return assemble(ctx, jsx)
}

function assemble(ctx: Ctx, jsx: string): string {
	const imports = [...ctx.imports.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([mod, names]) => {
			const specifier = mod === 'react' ? 'react' : `ui/${mod}`

			return `import { ${[...names].sort().join(', ')} } from '${specifier}'`
		})
		.join('\n')

	return jsx ? `${imports}\n\n${jsx}` : imports
}
