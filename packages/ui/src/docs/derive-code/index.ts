'use client'

import { Children, type ReactNode } from 'react'
import { assemble } from './imports'
import { defaultRegistry } from './registry'
import type { Context } from './types'
import { renderNodes } from './walk'

/**
 * Walk a React children tree and produce a simplified code block showing how
 * to use the components on display.
 *
 * - Styling wrappers (divs, spans, Fragments) are transparently skipped.
 * - Pure text/number children collapse to `…`.
 * - Runs of 3+ identical sibling renders collapse to a single representative
 *   so loops don't dominate the output.
 * - Imports are collected automatically from build-time component tags.
 *
 * Returns `null` when the subtree contains no recognized components — the
 * caller should then either provide an explicit `code` override or omit the
 * code block entirely.
 */
export function deriveCode(children: ReactNode): string | null {
	const context: Context = {
		registry: defaultRegistry,
		imports: new Map(),
	}

	const jsx = renderNodes(Children.toArray(children), context, '')

	if (context.imports.size === 0) return null

	return assemble(context, jsx)
}
