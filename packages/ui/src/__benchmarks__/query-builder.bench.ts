// @vitest-environment node

import { bench, describe } from 'vitest'
import { createRule } from '../modules/query/engine/query-node'
import { addChild, mapNode, removeChild } from '../modules/query/engine/query-tree'
import type { QueryGroup } from '../modules/query/engine/types'
import { collectRuleIds, QUERY_FIELDS, QUERY_TREES } from './fixtures'

// The three trees `query-evaluate.bench.ts` reads against, declared once in
// `fixtures.ts` so the two benches cannot drift apart on size.
const shallowWide = QUERY_TREES[0].tree

const balanced = QUERY_TREES[1].tree

const deepWide = QUERY_TREES[2].tree

const balancedIds = collectRuleIds(balanced)

const deepWideIds = collectRuleIds(deepWide)

const shallowWideFirstId = shallowWide.children[0]?.id ?? ''

describe('query-builder · mapNode (update root-level rule)', () => {
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

describe('query-builder · mapNode (miss — walks entire tree)', () => {
	bench('balanced · miss', () => {
		mapNode(balanced, '__absent__', (n) => ({ ...n }))
	})

	bench('deep-wide · miss', () => {
		mapNode(deepWide, '__absent__', (n) => ({ ...n }))
	})
})

describe('query-builder · addChild', () => {
	const rule = createRule(QUERY_FIELDS[0])

	bench('balanced · at root', () => {
		addChild(balanced, balanced.id, rule)
	})

	bench('deep-wide · at deep group', () => {
		const deepId = (deepWide.children[0] as QueryGroup).children[0]?.id as string

		addChild(deepWide, deepId, rule)
	})
})

describe('query-builder · removeChild', () => {
	bench('balanced · first leaf', () => {
		removeChild(balanced, balancedIds[0] as string)
	})

	bench('deep-wide · last leaf', () => {
		removeChild(deepWide, deepWideIds[deepWideIds.length - 1] as string)
	})
})

describe('query-builder · mapNode · 100 sequential updates (realistic flow)', () => {
	const ids = balancedIds.slice(0, 100)

	bench('balanced', () => {
		let tree: QueryGroup = balanced

		for (const id of ids) tree = mapNode(tree, id, (n) => ({ ...n }))
	})
})
