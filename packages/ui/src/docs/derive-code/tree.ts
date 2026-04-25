import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react'
import type { Ctx } from './types'

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

/**
 * Fragment and intrinsic HTML elements are transparent — they're used for
 * styling or grouping in the demo but aren't part of the API surface we want
 * to document.
 */
export function isPassThrough(element: ReactElement): boolean {
	return element.type === Fragment || typeof element.type === 'string'
}

export function isPrimitive(value: unknown): value is string | number | boolean {
	return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

// ---------------------------------------------------------------------------
// Tree inspection
// ---------------------------------------------------------------------------

export function elementChildren(element: ReactElement): ReactNode[] {
	return Children.toArray((element.props as { children?: ReactNode }).children)
}

/**
 * Flatten Fragments and HTML wrappers, keeping only meaningful component
 * elements. Works recursively so `<div><span><Button/></span></div>` surfaces
 * the Button at the top level.
 */
export function flattenPassThroughs(elements: ReactElement[]): ReactElement[] {
	const result: ReactElement[] = []

	for (const el of elements) {
		if (isPassThrough(el)) {
			result.push(...flattenPassThroughs(elementChildren(el).filter(isValidElement)))

			continue
		}

		result.push(el)
	}

	return result
}

/**
 * Collect the text/number leaves from a subtree into a single string,
 * walking through pass-through wrappers. Returns the concatenated text
 * or `null` if no text is found.
 */
export function extractTextContent(nodes: ReactNode[]): string | null {
	const parts: string[] = []

	for (const n of nodes) {
		if (typeof n === 'string' && n.trim() !== '') {
			parts.push(n.trim())
		} else if (typeof n === 'number') {
			parts.push(String(n))
		} else if (isValidElement(n) && isPassThrough(n)) {
			const nested = extractTextContent(elementChildren(n))

			if (nested) parts.push(nested)
		}
	}

	return parts.length > 0 ? parts.join(' ') : null
}

// ---------------------------------------------------------------------------
// Naming
// ---------------------------------------------------------------------------

/**
 * Resolve a name for a nested element prop. Registered components win; bare
 * intrinsic strings (e.g. `<div />` as an icon) pass through. Anything else
 * returns `null` so the caller drops the prop rather than emitting a name
 * that wouldn't have a matching import.
 */
export function getElementName(element: ReactElement, ctx: Ctx): string | null {
	const info = ctx.registry.byType.get(element.type)

	if (info) return info.name

	return typeof element.type === 'string' ? element.type : null
}
