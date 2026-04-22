import { cleanup, render } from '@testing-library/react'
import { bench, describe } from 'vitest'
import type { QueryGroupNode } from '../components/query-builder'
import { mapNode, QueryBuilder } from '../components/query-builder'
import { makeQueryTree, QUERY_FIELDS } from './fixtures'

function collectRuleIds(group: QueryGroupNode): string[] {
	const ids: string[] = []

	for (const child of group.children) {
		if (child.type === 'rule') ids.push(child.id)
		else ids.push(...collectRuleIds(child))
	}

	return ids
}

// Complements query-builder.bench.ts: this measures the full render cost of
// the recursive QueryGroup/QueryRule tree, not just tree utilities.

const shallowWide = makeQueryTree(1, 10) // 10 rules
const balanced = makeQueryTree(2, 4) // ~16 rules in 4 groups
const deepWide = makeQueryTree(3, 4) // ~64 rules in 16 groups

describe('QueryBuilder · initial render', () => {
	bench('shallow-wide (10 rules)', () => {
		render(<QueryBuilder fields={QUERY_FIELDS} value={shallowWide} />)

		cleanup()
	})

	bench('balanced (~16 rules)', () => {
		render(<QueryBuilder fields={QUERY_FIELDS} value={balanced} />)

		cleanup()
	})

	bench('deep-wide (~64 rules)', () => {
		render(<QueryBuilder fields={QUERY_FIELDS} value={deepWide} />)

		cleanup()
	})
})

describe('QueryBuilder · rerender after single-rule edit (5 edits/iter)', () => {
	const balancedIds = collectRuleIds(balanced).slice(0, 5)
	const deepWideIds = collectRuleIds(deepWide).slice(0, 5)

	bench('balanced (~16 rules)', () => {
		let tree = balanced
		const { rerender } = render(<QueryBuilder fields={QUERY_FIELDS} value={tree} />)

		for (let i = 0; i < balancedIds.length; i++) {
			const id = balancedIds[i] as string

			tree = mapNode(tree, id, (n) =>
				n.type === 'rule' ? { ...n, value: `v${i}` } : n,
			) as QueryGroupNode

			rerender(<QueryBuilder fields={QUERY_FIELDS} value={tree} />)
		}

		cleanup()
	})

	bench('deep-wide (~64 rules)', () => {
		let tree = deepWide
		const { rerender } = render(<QueryBuilder fields={QUERY_FIELDS} value={tree} />)

		for (let i = 0; i < deepWideIds.length; i++) {
			const id = deepWideIds[i] as string

			tree = mapNode(tree, id, (n) =>
				n.type === 'rule' ? { ...n, value: `v${i}` } : n,
			) as QueryGroupNode

			rerender(<QueryBuilder fields={QUERY_FIELDS} value={tree} />)
		}

		cleanup()
	})
})
