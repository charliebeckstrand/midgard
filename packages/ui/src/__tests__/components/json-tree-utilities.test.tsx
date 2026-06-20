import { describe, expect, it } from 'vitest'
import {
	buildSearchIndex,
	collectMatchPaths,
	collectPaths,
	encodePathSegment,
	filterEntries,
	flattenTree,
	getEntries,
	isBranch,
	joinPath,
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

describe('collectMatchPaths', () => {
	it('collects every branch on the path to a match and prunes the rest', () => {
		const data: JsonValue = {
			hit: { inner: { needle: 'x' } },
			miss: { other: { value: 1 } },
		}

		const index = buildSearchIndex(data, 'needle')

		const paths = collectMatchPaths(data, undefined, index)

		expect(paths).toEqual(new Set(['$', '$.hit', '$.hit.inner']))
	})

	it('returns an empty set when nothing matches', () => {
		const data: JsonValue = { a: { b: 1 } }

		const index = buildSearchIndex(data, 'zzz')

		expect(collectMatchPaths(data, undefined, index).size).toBe(0)
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

	it('uses the supplied search index to decide branch inclusion', () => {
		const data = { a: 1, b: { deep: 'match' } }

		const index = buildSearchIndex(data, 'match')

		expect(filterEntries(getEntries(data), 'match', index)).toHaveLength(1)
	})
})

describe('collectPaths', () => {
	it('returns an empty set for primitives', () => {
		expect(collectPaths('x')).toEqual(new Set())
	})

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

	it('does not collide a dotted key with a genuine nested path', () => {
		// The nested branch $.a.b and the sibling whose key is literally "a.b"
		// must resolve to distinct paths, or their expand state cross-wires.
		const paths = collectPaths({ a: { b: { x: 1 } }, 'a.b': { y: 2 } })

		expect(paths.has('$.a.b')).toBe(true) // a → b nested branch

		expect(paths.has('$.a\\.b')).toBe(true) // the "a.b" sibling branch

		expect(paths.size).toBe(4) // $, $.a, $.a.b, $.a\.b
	})
})

describe('joinPath / encodePathSegment', () => {
	it('joins ordinary keys without escaping', () => {
		expect(joinPath('$', 'a')).toBe('$.a')

		expect(joinPath('$.a', 'b')).toBe('$.a.b')

		expect(encodePathSegment('a')).toBe('a')
	})

	it('escapes the separator so a dotted key cannot masquerade as a nested path', () => {
		expect(joinPath('$', 'a.b')).toBe('$.a\\.b')

		expect(joinPath('$', 'a.b')).not.toBe(joinPath(joinPath('$', 'a'), 'b'))

		expect(encodePathSegment('a\\b')).toBe('a\\\\b')
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

		const nodes = flattenTree({
			data: tree,
			rootKey: undefined,
			expanded: new Set(),
			search: '',
			filter: false,
			searchIndex: new WeakMap(),
		})

		expect(nodes).toHaveLength(1)

		expect(nodes[0]?.type).toBe('branch-open')
	})

	it('emits open / leaf / close rows for an expanded branch', () => {
		const tree = { a: 1 }

		const nodes = flattenTree({
			data: tree,
			rootKey: undefined,
			expanded: new Set(['$']),
			search: '',
			filter: false,
			searchIndex: new WeakMap(),
		})

		const types = nodes.map((n) => n.type)

		expect(types).toEqual(['branch-open', 'leaf', 'branch-close'])
	})

	it('flags leaves matching the search term as highlighted', () => {
		const tree = { name: 'Alice' }

		const nodes = flattenTree({
			data: tree,
			rootKey: undefined,
			expanded: new Set(['$']),
			search: 'alice',
			filter: false,
			searchIndex: new WeakMap(),
		})

		const leaf = nodes.find((n) => n.type === 'leaf')

		expect(leaf?.highlighted).toBe(true)
	})

	it('recurses into open nested branches', () => {
		const tree = { outer: { inner: { leaf: 1 } } }

		const nodes = flattenTree({
			data: tree,
			rootKey: undefined,
			expanded: new Set(['$', '$.outer', '$.outer.inner']),
			search: '',
			filter: false,
			searchIndex: new WeakMap(),
		})

		expect(nodes.map((n) => n.type)).toEqual([
			'branch-open',
			'branch-open',
			'branch-open',
			'leaf',
			'branch-close',
			'branch-close',
			'branch-close',
		])
	})

	it('tracks depth as it descends into nested branches', () => {
		const tree = { outer: { inner: { leaf: 1 } } }

		const nodes = flattenTree({
			data: tree,
			rootKey: undefined,
			expanded: new Set(['$', '$.outer', '$.outer.inner']),
			search: '',
			filter: false,
			searchIndex: new WeakMap(),
		})

		expect(nodes.find((n) => n.type === 'leaf')?.depth).toBe(3)
	})

	it('drops leaves that do not match when filter is enabled', () => {
		const tree = { a: 'yes', b: 'no' }

		const index = buildSearchIndex(tree, 'yes')

		const nodes = flattenTree({
			data: tree,
			rootKey: undefined,
			expanded: new Set(['$']),
			search: 'yes',
			filter: true,
			searchIndex: index,
		})

		expect(nodes.filter((n) => n.type === 'leaf')).toHaveLength(1)
	})
})
