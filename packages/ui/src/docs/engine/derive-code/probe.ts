import { Children, isValidElement, type ReactNode } from 'react'
import { classifyElement } from './classify'
import { defaultRegistry } from './registry'
import type { ComponentRegistry } from './types'

/**
 * Whether `deriveCode` would produce anything for this subtree — that is,
 * whether anything in it registers an import.
 *
 * `deriveCode` returns `null` exactly when its walk collected no imports, so
 * finding one element that contributes answers the question. This
 * short-circuits there instead of rendering the whole JSX string, resolving a
 * preamble, and possibly walking a second pass for the consistency rule.
 *
 * Both walks sort an element through {@link classifyElement}, so neither
 * restates the other's rule. A recognized component imports itself. An
 * unrecognized one renders its children in its place, so the walk descends.
 * Without children it stands for its build-time snippet, which contributes
 * when its import table has an entry — the case a demo-local helper rests on,
 * as in `<Example><ClosableExample /></Example>`.
 *
 * @remarks
 * Element-valued props and {@link SourceFacts} need no case of their own.
 * `renderElement` reads both only from an element it has already recognized,
 * which answers `true` on its own.
 */
export function hasDerivableCode(
	children: ReactNode,
	registry: ComponentRegistry = defaultRegistry,
): boolean {
	const stack: ReactNode[] = Children.toArray(children)

	while (stack.length > 0) {
		const node = stack.pop()

		if (!isValidElement(node)) continue

		const classified = classifyElement(node, registry)

		if (classified.kind === 'recognized') return true

		if (classified.kind === 'snippet') {
			if (Object.keys(classified.snippet.imports).length > 0) return true

			continue
		}

		if (classified.kind === 'none') continue

		// Not `push(...nodes)`: a spread passes each entry as an argument and
		// blows the call-argument ceiling on a large array.
		for (const child of classified.nodes) stack.push(child)
	}

	return false
}
