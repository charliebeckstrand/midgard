import { Children, Fragment, type ReactElement, type ReactNode } from 'react'
import type { ComponentInfo, ComponentRegistry, HelperSnippet } from './types'

// The rule that sorts an element for the walk and for the probe. The probe runs
// when each `Example` mounts, so this module stays small: the walk itself loads
// only when a reader opens a code block.

/**
 * Fragment and intrinsic HTML elements are transparent: styling/grouping
 * wrappers outside the documented API surface.
 */
export function isPassThrough(element: ReactElement): boolean {
	return element.type === Fragment || typeof element.type === 'string'
}

export function elementChildren(element: ReactElement): ReactNode[] {
	return Children.toArray((element.props as { children?: ReactNode }).children)
}

/**
 * Which of the walk's cases an element falls in. `recognized` carries the
 * component the docs document. `children` carries the nodes that render in an
 * unrecognized element's place. `snippet` carries the build-time source the
 * docs plugin attached to a childless helper, and `none` is an element the
 * walk drops.
 */
export type ElementCase =
	| { kind: 'recognized'; info: ComponentInfo }
	| { kind: 'children'; nodes: ReactNode[] }
	| { kind: 'snippet'; snippet: HelperSnippet }
	| { kind: 'none' }

/**
 * Sort one element into its case. The renderer and the emptiness probe both
 * switch on the result, so neither restates the other's rule. That drift is
 * what once hid the code block under every demo-local helper.
 */
export function classifyElement(element: ReactElement, registry: ComponentRegistry): ElementCase {
	const info = resolveTypeIn(registry, element.type)

	if (info) return { kind: 'recognized', info }

	const nodes = elementChildren(element)

	if (nodes.length > 0) return { kind: 'children', nodes }

	const snippet = readSnippet(element.type)

	return snippet === null ? { kind: 'none' } : { kind: 'snippet', snippet }
}

/**
 * `resolveType` against a bare registry, for callers that have no walk
 * `Context` to build. {@link classifyElement} is one. The renderer and
 * the emptiness probe both sort an element through it, so both answer "is this
 * a component we document?" the same way.
 */
export function resolveTypeIn(
	registry: ComponentRegistry,
	type: unknown,
): ComponentInfo | undefined {
	const info = registry.byType.get(type)

	if (info) return info

	const displayName = (type as { displayName?: unknown } | null)?.displayName

	if (typeof displayName !== 'string') return undefined

	const named = registry.byName.get(displayName)

	return named?.external ? named : undefined
}

/**
 * Read the {@link HelperSnippet} that the docs plugin's `pre` transform
 * attaches to a helper component as `__snippet`. Returns null for built-ins,
 * undecorated functions, and a `__snippet` of another shape.
 */
export function readSnippet(type: unknown): HelperSnippet | null {
	if (typeof type !== 'function') return null

	const snippet: unknown = (type as { __snippet?: unknown }).__snippet

	if (typeof snippet !== 'object' || snippet === null) return null

	const { name, declarations, blocks, imports } = snippet as Partial<HelperSnippet>

	const valid =
		typeof name === 'string' &&
		Array.isArray(declarations) &&
		Array.isArray(blocks) &&
		typeof imports === 'object' &&
		imports !== null

	return valid ? (snippet as HelperSnippet) : null
}
