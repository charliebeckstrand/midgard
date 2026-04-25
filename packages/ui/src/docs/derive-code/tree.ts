import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react'
import type { Ctx } from './types'

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isMeaningfulElement(node: ReactNode): node is ReactElement {
	return isValidElement(node)
}

/**
 * Fragment and intrinsic HTML elements are transparent — they're used for
 * styling or grouping in the demo but aren't part of the API surface we want
 * to document.
 */
export function isPassThrough(element: ReactElement): boolean {
	if (element.type === Fragment) return true

	if (typeof element.type === 'string') return true

	return false
}

export function isPrimitive(value: unknown): value is string | number | boolean {
	return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

// ---------------------------------------------------------------------------
// Tree inspection
// ---------------------------------------------------------------------------

/**
 * Flatten Fragments and HTML wrappers, keeping only meaningful component
 * elements. Works recursively so `<div><span><Button/></span></div>` surfaces
 * the Button at the top level.
 */
export function flattenPassThroughs(elements: ReactElement[]): ReactElement[] {
	const result: ReactElement[] = []

	for (const el of elements) {
		if (isPassThrough(el)) {
			const children = Children.toArray((el.props as { children?: ReactNode }).children).filter(
				isMeaningfulElement,
			)

			result.push(...flattenPassThroughs(children))

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
			const children = Children.toArray((n.props as { children?: ReactNode }).children)
			const nested = extractTextContent(children)

			if (nested) parts.push(nested)
		}
	}

	return parts.length > 0 ? parts.join(' ') : null
}

// ---------------------------------------------------------------------------
// Naming
// ---------------------------------------------------------------------------

export function getElementName(element: ReactElement, ctx: Ctx): string | null {
	const info = ctx.registry.byType.get(element.type)

	if (info) return info.name

	const type = element.type as
		| string
		| { displayName?: string; name?: string; render?: { displayName?: string; name?: string } }

	if (typeof type === 'string') return type

	if (typeof type === 'function')
		return (
			(type as { displayName?: string; name?: string }).displayName ??
			(type as { name?: string }).name ??
			null
		)

	if (typeof type === 'object' && type !== null) {
		if (type.displayName) return type.displayName

		if (type.render) return type.render.displayName ?? type.render.name ?? null
	}

	return null
}
