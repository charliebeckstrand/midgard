// The renderer counterpart to the printer: both consume one seeded UsageDoc, so
// the live preview and the printed snippet can never drift. React-dependent, so
// it sits beside the printer but stays out of the React-free `index` barrel —
// only the browser chrome imports it.

import { type ComponentType, createElement, type ReactNode } from 'react'
import type { Expr, UsageDoc } from './ast'

/** Resolves a JSX tag name to a real component; `undefined` for an unknown tag. */
export type SymbolResolver = (name: string) => ComponentType<Record<string, unknown>> | undefined

/**
 * Walk a synthesized {@link UsageDoc} to a live React tree. No `eval` and no
 * re-parse: `jsx` becomes `createElement`, hoisted `const`s bind into a local
 * scope, literals are themselves, and synthesized handlers are inert. Component
 * docs only; a callable's `call` / destructure needs a harness (a later phase)
 * and throws here, where the caller's error boundary falls back to code-only.
 */
export function renderUsage(doc: UsageDoc, resolve: SymbolResolver): ReactNode {
	const scope = new Map<string, unknown>()

	let shown: ReactNode = null

	for (const stmt of doc.body) {
		if (stmt.s === 'const') scope.set(stmt.name, evaluate(stmt.value, scope, resolve))
		else if (stmt.s === 'show') shown = evaluate(stmt.value, scope, resolve) as ReactNode
		else throw new Error('live rendering a hook binding needs a harness')
	}

	return shown
}

/** Evaluate one expression against the current binding scope. */
function evaluate(expr: Expr, scope: Map<string, unknown>, resolve: SymbolResolver): unknown {
	switch (expr.e) {
		case 'jsx': {
			const type = resolve(expr.tag)

			if (!type) throw new Error(`unresolved component <${expr.tag}>`)

			const props: Record<string, unknown> = {}

			for (const attr of expr.attrs) {
				props[attr.name] = attr.value === null ? true : evaluate(attr.value, scope, resolve)
			}

			const children = expr.children.map((child) => evaluate(child, scope, resolve) as ReactNode)

			return createElement(type, props, ...children)
		}

		case 'str':
		case 'num':
		case 'bool':
		case 'text':
			return expr.value

		case 'ident':
			return scope.get(expr.name)

		case 'array':
			return expr.items.map((item) => evaluate(item, scope, resolve))

		case 'object':
			return Object.fromEntries(
				expr.fields.map((field) => [field.key, evaluate(field.value, scope, resolve)]),
			)

		case 'arrow':
			return () => {}

		case 'call':
			throw new Error(`live rendering a call to ${expr.callee} needs a harness`)
	}
}
