// @vitest-environment node

import { bench, describe } from 'vitest'
import type { JsonValue } from '../components/json-tree'
import {
	buildSearchIndex,
	collectPaths,
	filterEntries,
	getEntries,
	treeContainsMatch,
} from '../components/json-tree/utilities'
import { makeJsonTree } from './fixtures'

// Tree sizes chosen so branch count grows exponentially:
// small   (d=3, b=5)   = ~125 branches
// medium  (d=4, b=5)   = ~625 branches
// large   (d=5, b=5)   = ~3,125 branches
// huge    (d=6, b=4)   = ~4,096 branches

const small = makeJsonTree(3, 5)
const medium = makeJsonTree(4, 5)
const large = makeJsonTree(5, 5)
const huge = makeJsonTree(6, 4)

describe('json-tree: buildSearchIndex', () => {
	bench('small (d3×b5) · hit', () => {
		buildSearchIndex(small, 'value-root')
	})

	bench('medium (d4×b5) · hit', () => {
		buildSearchIndex(medium, 'value-root')
	})

	bench('large (d5×b5) · hit', () => {
		buildSearchIndex(large, 'value-root')
	})

	bench('huge (d6×b4) · hit', () => {
		buildSearchIndex(huge, 'value-root')
	})

	bench('large (d5×b5) · miss', () => {
		buildSearchIndex(large, '__absent__')
	})
})

describe('json-tree: treeContainsMatch', () => {
	bench('large (d5×b5) · hit', () => {
		treeContainsMatch(large, 'value-root')
	})

	bench('large (d5×b5) · miss', () => {
		treeContainsMatch(large, '__absent__')
	})
})

describe('json-tree: filterEntries (with index)', () => {
	const term = 'value-root'
	const index = buildSearchIndex(large, term)
	const rootEntries = getEntries(large)

	bench('root entries @ large', () => {
		filterEntries(rootEntries, term, index)
	})

	bench('root entries @ large · no index (walks each)', () => {
		filterEntries(rootEntries, term)
	})
})

describe('json-tree: collectPaths', () => {
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

describe('json-tree: getEntries', () => {
	const obj = large as { [key: string]: JsonValue }
	const arr: JsonValue[] = Object.values(obj)

	bench('object', () => {
		getEntries(obj)
	})

	bench('array (same cardinality)', () => {
		getEntries(arr)
	})
})
