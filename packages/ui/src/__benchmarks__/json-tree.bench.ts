// @vitest-environment node

import type { JsonValue } from '../components/json-tree'
import {
	buildSearchIndex,
	collectPaths,
	filterEntries,
	getEntries,
} from '../components/json-tree/json-tree-utilities'
import { compareBenches } from './compare'
import { JSON_HIT, JSON_MISS, JSON_TREES, makeJsonTree } from './fixtures'

// Tree sizes (branch count grows exponentially):
// small   (d=3, b=5)   = ~125 branches
// medium  (d=4, b=5)   = ~625 branches
// large   (d=5, b=5)   = ~3,125 branches
// huge    (d=6, b=4)   = ~4,096 branches

const { small, medium, large } = JSON_TREES

/** This file's own rung: wider still, and only the pure utilities can afford it. */
const huge = makeJsonTree(6, 4)

compareBenches('json-tree · buildSearchIndex', (bench) => {
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

compareBenches('json-tree · filterEntries', (bench) => {
	const index = buildSearchIndex(large, JSON_HIT)

	const rootEntries = getEntries(large)

	bench('root entries @ large', () => {
		filterEntries(rootEntries, JSON_HIT, index)
	})
})

compareBenches('json-tree · collectPaths', (bench) => {
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

compareBenches('json-tree · getEntries', (bench) => {
	const object = large as { [key: string]: JsonValue }

	const array: JsonValue[] = Object.values(object)

	bench('object', () => {
		getEntries(object)
	})

	bench('array (same cardinality)', () => {
		getEntries(array)
	})
})
