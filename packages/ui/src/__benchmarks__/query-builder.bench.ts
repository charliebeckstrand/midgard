// @vitest-environment node

import { createRule } from '../modules/query/engine/query-node'
import { addChild, mapNode, removeChild } from '../modules/query/engine/query-tree'
import type { QueryGroup } from '../modules/query/engine/types'
import { compareBenches } from './compare'
import { collectRuleIds, QUERY_FIELDS, QUERY_TREES } from './fixtures'

// The three trees `query-evaluate.bench.ts` reads against, declared once in
// `fixtures.ts` so the two benches cannot drift apart on size.
const shallowWide = QUERY_TREES[0].tree

const balanced = QUERY_TREES[1].tree

const deepWide = QUERY_TREES[2].tree

const balancedIds = collectRuleIds(balanced)

const deepWideIds = collectRuleIds(deepWide)

const shallowWideFirstId = shallowWide.children[0]?.id ?? ''

compareBenches('query-builder · mapNode (update root-level rule)', (bench) => {
	bench('shallow-wide · first child', () => {
		mapNode(shallowWide, shallowWideFirstId, (node) => ({ ...node }))
	})

	bench('balanced · first leaf', () => {
		mapNode(balanced, balancedIds[0] as string, (node) => ({ ...node }))
	})

	bench('balanced · last leaf', () => {
		mapNode(balanced, balancedIds[balancedIds.length - 1] as string, (node) => ({ ...node }))
	})

	bench('deep-wide · first leaf', () => {
		mapNode(deepWide, deepWideIds[0] as string, (node) => ({ ...node }))
	})

	bench('deep-wide · last leaf', () => {
		mapNode(deepWide, deepWideIds[deepWideIds.length - 1] as string, (node) => ({ ...node }))
	})
})

compareBenches('query-builder · mapNode (miss — walks entire tree)', (bench) => {
	bench('balanced · miss', () => {
		mapNode(balanced, '__absent__', (node) => ({ ...node }))
	})

	bench('deep-wide · miss', () => {
		mapNode(deepWide, '__absent__', (node) => ({ ...node }))
	})
})

compareBenches('query-builder · addChild', (bench) => {
	const rule = createRule(QUERY_FIELDS[0])

	bench('balanced · at root', () => {
		addChild(balanced, balanced.id, rule)
	})

	bench('deep-wide · at deep group', () => {
		const deepId = (deepWide.children[0] as QueryGroup).children[0]?.id as string

		addChild(deepWide, deepId, rule)
	})
})

compareBenches('query-builder · removeChild', (bench) => {
	bench('balanced · first leaf', () => {
		removeChild(balanced, balancedIds[0] as string)
	})

	bench('deep-wide · last leaf', () => {
		removeChild(deepWide, deepWideIds[deepWideIds.length - 1] as string)
	})
})

compareBenches('query-builder · mapNode · 100 sequential updates (realistic flow)', (bench) => {
	const ids = balancedIds.slice(0, 100)

	bench('balanced', () => {
		let tree: QueryGroup = balanced

		for (const id of ids) tree = mapNode(tree, id, (node) => ({ ...node }))
	})
})
