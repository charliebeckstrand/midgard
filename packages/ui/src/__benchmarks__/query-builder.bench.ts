// @vitest-environment node

import { bench, describe } from 'vitest'
import type { QueryGroup, QueryNode } from '../components/query-builder/types'
import { addChild, createRule, mapNode, removeChild } from '../components/query-builder/utilities'
import { makeQueryTree, QUERY_FIELDS } from './fixtures'

// Tree sizes (depth × branching): total rules ≈ branching^(depth+1)
// shallow-wide  (d=1, b=20)  =  20 rules
// balanced      (d=3, b=4)   = 256 rules
// deep-wide     (d=4, b=4)   = 1024 rules

const shallowWide = makeQueryTree(1, 20)
const balanced = makeQueryTree(3, 4)
const deepWide = makeQueryTree(4, 4)

/** Collect every rule id in a tree, in walk order. */
function collectRuleIds(group: QueryGroup): string[] {
	const ids: string[] = []

	function walk(nodes: QueryNode[]) {
		for (const n of nodes) {
			if (n.type === 'rule') ids.push(n.id)
			else walk(n.children)
		}
	}

	walk(group.children)

	return ids
}

const balancedIds = collectRuleIds(balanced)
const deepWideIds = collectRuleIds(deepWide)
const shallowWideFirstId = shallowWide.children[0]?.id ?? ''

describe('query-builder: mapNode (update root-level rule)', () => {
	bench('shallow-wide · first child', () => {
		mapNode(shallowWide, shallowWideFirstId, (n) => ({ ...n }))
	})

	bench('balanced · first leaf', () => {
		mapNode(balanced, balancedIds[0] as string, (n) => ({ ...n }))
	})

	bench('balanced · last leaf', () => {
		mapNode(balanced, balancedIds[balancedIds.length - 1] as string, (n) => ({ ...n }))
	})

	bench('deep-wide · first leaf', () => {
		mapNode(deepWide, deepWideIds[0] as string, (n) => ({ ...n }))
	})

	bench('deep-wide · last leaf', () => {
		mapNode(deepWide, deepWideIds[deepWideIds.length - 1] as string, (n) => ({ ...n }))
	})
})

describe('query-builder: mapNode (miss — walks entire tree)', () => {
	bench('balanced · miss', () => {
		mapNode(balanced, '__absent__', (n) => ({ ...n }))
	})

	bench('deep-wide · miss', () => {
		mapNode(deepWide, '__absent__', (n) => ({ ...n }))
	})
})

describe('query-builder: addChild', () => {
	const rule = createRule(QUERY_FIELDS[0])

	bench('balanced · at root', () => {
		addChild(balanced, balanced.id, rule)
	})

	bench('deep-wide · at deep group', () => {
		const deepId = (deepWide.children[0] as QueryGroup).children[0]?.id as string

		addChild(deepWide, deepId, rule)
	})
})

describe('query-builder: removeChild', () => {
	bench('balanced · first leaf', () => {
		removeChild(balanced, balancedIds[0] as string)
	})

	bench('deep-wide · last leaf', () => {
		removeChild(deepWide, deepWideIds[deepWideIds.length - 1] as string)
	})
})

describe('query-builder: mapNode · 100 sequential updates (realistic flow)', () => {
	const ids = balancedIds.slice(0, 100)

	bench('balanced', () => {
		let tree: QueryGroup = balanced

		for (const id of ids) tree = mapNode(tree, id, (n) => ({ ...n }))
	})
})
