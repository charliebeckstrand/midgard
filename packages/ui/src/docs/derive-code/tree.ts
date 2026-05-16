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

export type ChildItem =
	| { kind: 'text'; value: string }
	| { kind: 'element'; value: ReactElement }

/**
 * Walk children in source order, flattening pass-through wrappers and
 * surfacing both recognized elements and text leaves as a position-preserving
 * sequence. Callers render mixed children without losing original ordering
 * (e.g. `<Card><Icon />Hello<Button /></Card>` keeps `Hello` between the two
 * elements instead of appended at the end).
 */
export function collectChildItems(nodes: ReactNode[]): ChildItem[] {
	const items: ChildItem[] = []

	for (const n of nodes) {
		if (typeof n === 'string') {
			const trimmed = n.trim()

			if (trimmed !== '') items.push({ kind: 'text', value: trimmed })
		} else if (typeof n === 'number') {
			items.push({ kind: 'text', value: String(n) })
		} else if (isValidElement(n)) {
			if (isPassThrough(n)) {
				items.push(...collectChildItems(elementChildren(n)))
			} else {
				items.push({ kind: 'element', value: n })
			}
		}
	}

	return items
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
