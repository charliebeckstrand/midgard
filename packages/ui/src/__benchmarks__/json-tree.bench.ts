// @vitest-environment node

import { bench, describe } from 'vitest'
import type { JsonValue } from '../components/json-tree'
import {
	buildSearchIndex,
	collectPaths,
	filterEntries,
	getEntries,
	treeContainsMatch,
} from '../components/json-tree/json-tree-utilities'
import { JSON_HIT, JSON_MISS, JSON_TREES, makeJsonTree } from './fixtures'

// Tree sizes (branch count grows exponentially):
// small   (d=3, b=5)   = ~125 branches
// medium  (d=4, b=5)   = ~625 branches
// large   (d=5, b=5)   = ~3,125 branches
// huge    (d=6, b=4)   = ~4,096 branches

const { small, medium, large } = JSON_TREES

/** This file's own rung: wider still, and only the pure utilities can afford it. */
const huge = makeJsonTree(6, 4)

describe('json-tree · buildSearchIndex', () => {
	for (const [label, tree] of [
		['small (d3×b5)', small],
		['medium (d4×b5)', medium],
		['large (d5×b5)', large],
		['huge (d6×b4)', huge],
	] as const) {
		bench(`${label} · hit`, () => {
			buildSearchIndex(tree, JSON_HIT)
		})
	}

	bench('large (d5×b5) · miss', () => {
		buildSearchIndex(large, JSON_MISS)
	})
})

describe('json-tree · treeContainsMatch', () => {
	bench('large (d5×b5) · hit', () => {
		treeContainsMatch(large, JSON_HIT)
	})

	bench('large (d5×b5) · miss', () => {
		treeContainsMatch(large, JSON_MISS)
	})
})

describe('json-tree · filterEntries (with index)', () => {
	const index = buildSearchIndex(large, JSON_HIT)

	const rootEntries = getEntries(large)

	bench('root entries @ large', () => {
		filterEntries(rootEntries, JSON_HIT, index)
	})

	bench('root entries @ large · no index (walks each)', () => {
		filterEntries(rootEntries, JSON_HIT)
	})
})

describe('json-tree · collectPaths', () => {
	bench('large (d5×b5) · no maxDepth', () => {
		collectPaths(large, '$')
	})

	bench('large (d5×b5) · maxDepth=2', () => {
		collectPaths(large, '$', 2)
	})

	bench('huge (d6×b4) · no maxDepth', () => {
		collectPaths(huge, '$')
	})
})

describe('json-tree · getEntries', () => {
	const obj = large as { [key: string]: JsonValue }

	const arr: JsonValue[] = Object.values(obj)

	bench('object', () => {
		getEntries(obj)
	})

	bench('array (same cardinality)', () => {
		getEntries(arr)
	})
})
