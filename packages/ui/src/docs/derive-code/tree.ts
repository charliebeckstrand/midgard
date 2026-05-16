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

export type ChildItem = { kind: 'text'; value: string } | { kind: 'element'; value: ReactElement }

/**
 * Walk children in source order, flattening pass-through wrappers and
 * surfacing both recognized elements and text leaves as a position-preserving
 * sequence. Adjacent text leaves are coalesced into a single item so inline
 * interpolation like `<Foo>Hi {name}</Foo>` keeps rendering on one line.
 */
export function collectChildItems(nodes: ReactNode[]): ChildItem[] {
	const items: ChildItem[] = []

	let textBuffer: string[] = []

	const flushText = () => {
		if (textBuffer.length === 0) return

		items.push({ kind: 'text', value: textBuffer.join(' ') })

		textBuffer = []
	}

	for (const n of nodes) {
		if (typeof n === 'string') {
			const trimmed = n.trim()

			if (trimmed !== '') textBuffer.push(trimmed)
		} else if (typeof n === 'number') {
			textBuffer.push(String(n))
		} else if (isValidElement(n)) {
			if (isPassThrough(n)) {
				// Walk the wrapper's children; merge their text leaves into the
				// current buffer so `<span>Hi</span> there` coalesces.
				for (const nested of collectChildItems(elementChildren(n))) {
					if (nested.kind === 'text') {
						textBuffer.push(nested.value)
					} else {
						flushText()

						items.push(nested)
					}
				}
			} else {
				flushText()

				items.push({ kind: 'element', value: n })
			}
		}
	}

	flushText()

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
