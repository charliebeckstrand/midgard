import { describe, expect, it } from 'vitest'
import {
	buildSearchIndex,
	collectPaths,
	filterEntries,
	flattenTree,
	getEntries,
	isBranch,
	matchesSearch,
	normalizeSearch,
	treeContainsMatch,
	valueType,
} from '../../components/json-tree/json-tree-utilities'
import type { JsonValue } from '../../components/json-tree/types'

describe('normalizeSearch', () => {
	it('returns an empty, non-filtering search for undefined / null', () => {
		expect(normalizeSearch(undefined)).toEqual({ value: '', filter: false })
	})

	it('treats a bare string as a non-filtering search', () => {
		expect(normalizeSearch('term')).toEqual({ value: 'term', filter: false })
	})

	it('honors a filter flag on the object form', () => {
		expect(normalizeSearch({ value: 'term', filter: true })).toEqual({
			value: 'term',
			filter: true,
		})
	})

	it('defaults the filter flag to false when omitted', () => {
		expect(normalizeSearch({ value: 'term' })).toEqual({ value: 'term', filter: false })
	})
})

describe('isBranch', () => {
	it('returns true for objects and arrays', () => {
		expect(isBranch({})).toBe(true)
		expect(isBranch([])).toBe(true)
	})

	it('returns false for primitives and null', () => {
		expect(isBranch('s')).toBe(false)
		expect(isBranch(0)).toBe(false)
		expect(isBranch(true)).toBe(false)
		expect(isBranch(null)).toBe(false)
	})
})

describe('getEntries', () => {
	it('returns [index, value] pairs for an array', () => {
		expect(getEntries(['a', 'b'])).toEqual([
			[0, 'a'],
			[1, 'b'],
		])
	})

	it('returns Object.entries for an object', () => {
		expect(getEntries({ a: 1, b: 2 })).toEqual([
			['a', 1],
			['b', 2],
		])
	})

	it('returns [] for primitives and null', () => {
		expect(getEntries('s')).toEqual([])
		expect(getEntries(null)).toEqual([])
	})
})

describe('matchesSearch', () => {
	it('returns false when term is empty', () => {
		expect(matchesSearch('key', 'value', '')).toBe(false)
	})

	it('matches against the key (case-insensitive)', () => {
		expect(matchesSearch('Name', 'Alice', 'name')).toBe(true)
	})

	it('matches against a primitive value (case-insensitive)', () => {
		expect(matchesSearch('k', 'Alice', 'alice')).toBe(true)
	})

	it('does not match against branch values', () => {
		expect(matchesSearch('k', { nested: 'alice' }, 'alice')).toBe(false)
	})
})

describe('treeContainsMatch', () => {
	it('finds a match nested in a child branch', () => {
		expect(treeContainsMatch({ outer: { inner: 'needle' } }, 'needle')).toBe(true)
	})

	it('returns false when the tree has no match', () => {
		expect(treeContainsMatch({ a: 'x' }, 'needle')).toBe(false)
	})

	it('returns false when term is empty', () => {
		expect(treeContainsMatch({ a: 'x' }, '')).toBe(false)
	})
})

describe('buildSearchIndex', () => {
	it('marks branches containing a match as true', () => {
		const tree = { outer: { inner: 'needle' }, other: 'no' }

		const index = buildSearchIndex(tree, 'needle')

		expect(index.get(tree)).toBe(true)
		expect(index.get(tree.outer)).toBe(true)
	})

	it('returns an empty index for an empty term', () => {
		const tree = { a: 'x' }

		expect(buildSearchIndex(tree, '').get(tree)).toBeUndefined()
	})
})

describe('filterEntries', () => {
	it('keeps entries whose key or value matches the term', () => {
		const entries: [string | number, JsonValue][] = [
			['name', 'Alice'],
			['age', 30],
		]

		expect(filterEntries(entries, 'alice')).toEqual([['name', 'Alice']])
	})

	it('keeps branch entries whose subtree contains a match', () => {
		const entries: [string | number, JsonValue][] = [['outer', { inner: 'needle' }]]

		expect(filterEntries(entries, 'needle')).toEqual(entries)
	})
})

describe('collectPaths', () => {
	it('returns one path per branch node anchored at $', () => {
		const paths = collectPaths({ a: { b: 1 }, c: 2 })

		expect(paths.has('$')).toBe(true)
		expect(paths.has('$.a')).toBe(true)
		expect(paths.has('$.c')).toBe(false) // 2 is a leaf, not a branch
	})

	it('honors a maxDepth cap', () => {
		const paths = collectPaths({ a: { b: { c: 1 } } }, undefined, 1)

		expect(paths.has('$')).toBe(true)
		expect(paths.has('$.a')).toBe(false)
	})

	it('uses the supplied root key', () => {
		expect(collectPaths({ a: 1 }, 'data').has('data')).toBe(true)
	})
})

describe('valueType', () => {
	it('maps each JSON primitive to its label', () => {
		expect(valueType(null)).toBe('null')
		expect(valueType('s')).toBe('string')
		expect(valueType(1)).toBe('number')
		expect(valueType(true)).toBe('boolean')
	})
})

describe('flattenTree', () => {
	it('emits a single branch-open row for a collapsed root', () => {
		const tree = { a: 1 }

		const nodes = flattenTree(tree, undefined, new Set(), '', false, new WeakMap())

		expect(nodes).toHaveLength(1)
		expect(nodes[0]?.kind).toBe('branch-open')
	})

	it('emits open / leaf / close rows for an expanded branch', () => {
		const tree = { a: 1 }

		const nodes = flattenTree(tree, undefined, new Set(['$']), '', false, new WeakMap())

		const kinds = nodes.map((n) => n.kind)

		expect(kinds).toEqual(['branch-open', 'leaf', 'branch-close'])
	})

	it('flags leaves matching the search term as highlighted', () => {
		const tree = { name: 'Alice' }

		const nodes = flattenTree(tree, undefined, new Set(['$']), 'alice', false, new WeakMap())

		const leaf = nodes.find((n) => n.kind === 'leaf')

		expect(leaf?.highlighted).toBe(true)
	})
})
