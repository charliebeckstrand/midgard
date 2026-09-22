import { onTestFinished } from 'vitest'

/**
 * Puts `node` on `document.body` for the current test, and removes it when the
 * test finishes.
 *
 * @remarks
 * A hook test that needs real focus, a real `getElementById`, or a real
 * `contains` puts its own nodes on the body, outside every React root. RTL's
 * `cleanup` does not remove them. The `unit` project shares one window across
 * a worker's files, so a node that stays reaches the queries of a later file.
 *
 * The removal runs in `onTestFinished`, so it runs when an assertion throws,
 * and it runs before the residue guard reads the body. A wipe such as
 * `document.body.innerHTML = ''` does not have that order. It runs in an
 * `afterEach`, which is earlier, and it also removes what the subject left on
 * the body. The guard then has nothing to report.
 *
 * A call from a `beforeEach` gives the same removal, because `onTestFinished`
 * binds to the test that the hook runs for.
 *
 * @param node - The node to add. It keeps its subtree and its identity.
 * @param position - Where the node goes: after the children of the body, or
 * before them. `'prepend'` puts a node ahead of the others in document order.
 * @returns The node, so a case can build and add it in one expression.
 *
 * @example
 * ```typescript
 * const container = attach(document.createElement('div'))
 *
 * container.innerHTML = '<button>A</button><button>B</button>'
 * ```
 */
export function attach<T extends Element>(node: T, position: 'append' | 'prepend' = 'append'): T {
	document.body[position](node)

	onTestFinished(() => node.remove())

	return node
}
