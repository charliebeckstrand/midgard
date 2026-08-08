/**
 * QueryBuilder's render cost: the recursive `QueryGroup`/`QueryRule` tree in
 * full, where `query-builder.bench.ts` measures the tree utilities alone. The
 * edit scenario re-renders a mounted builder against a tree rebuilt through
 * `mapNode`, the shape a controlled consumer's change handler produces.
 */

import { describe } from 'vitest'
import { mapNode, QueryBuilder, type QueryGroupNode } from '../modules/query'
import { collectRuleIds, makeQueryTree, QUERY_FIELDS } from './fixtures'
import { mountBenches, rerenderBench } from './harness'

const shallowWide = makeQueryTree(1, 10)

const balanced = makeQueryTree(2, 4)

const deepWide = makeQueryTree(3, 4)

/** Edits per re-render iteration — enough that per-edit work outruns the harness. */
const EDITS = 5

describe('QueryBuilder · initial render', () => {
	mountBenches(
		[
			{ label: 'shallow-wide (10 rules)', tree: shallowWide },
			{ label: 'balanced (~16 rules)', tree: balanced },
			{ label: 'deep-wide (~64 rules)', tree: deepWide },
		],
		({ label }) => label,
		({ tree }) => <QueryBuilder fields={QUERY_FIELDS} value={tree} />,
	)
})

describe(`QueryBuilder · rerender after single-rule edit (${EDITS} edits/iter)`, () => {
	const built = (tree: QueryGroupNode) => <QueryBuilder fields={QUERY_FIELDS} value={tree} />

	for (const { label, root } of [
		{ label: 'balanced (~16 rules)', root: balanced },
		{ label: 'deep-wide (~64 rules)', root: deepWide },
	]) {
		const ids = collectRuleIds(root).slice(0, EDITS)

		rerenderBench(
			label,
			() => built(root),
			(rerender, iteration) => {
				let tree = root

				for (const [edit, id] of ids.entries()) {
					// A fresh value string per iteration, so no edit lands on the value the
					// rule already holds and bails on an equality guard.
					tree = mapNode(tree, id, (node) =>
						node.type === 'rule' ? { ...node, value: `v${iteration}-${edit}` } : node,
					) as QueryGroupNode

					rerender(built(tree))
				}
			},
		)
	}
})
