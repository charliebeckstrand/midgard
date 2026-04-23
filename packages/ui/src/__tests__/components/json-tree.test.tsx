import { describe, expect, it, vi } from 'vitest'
import { JsonTree } from '../../components/json-tree'
import { JsonNodeRow } from '../../components/json-tree/node-row'
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
} from '../../components/json-tree/utilities'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('JsonTree', () => {
	it('renders with data-slot="json-tree" and role="tree"', () => {
		const { container } = renderUI(<JsonTree data={{}} />)

		const el = bySlot(container, 'json-tree')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('role', 'tree')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<JsonTree data={{}} className="custom" />)

		const el = bySlot(container, 'json-tree')

		expect(el?.className).toContain('custom')
	})

	it('renders primitive leaves with their values', () => {
		renderUI(
			<JsonTree data={{ name: 'Ada', age: 42, active: true, meta: null }} defaultExpandDepth={1} />,
		)

		expect(screen.getByText('"Ada"')).toBeInTheDocument()
		expect(screen.getByText('42')).toBeInTheDocument()
		expect(screen.getByText('true')).toBeInTheDocument()
		expect(screen.getByText('null')).toBeInTheDocument()
	})

	it('renders object keys with quotes and array indices without quotes', () => {
		renderUI(<JsonTree data={{ tags: ['a', 'b'] }} defaultExpandDepth={2} />)

		expect(screen.getByText('"tags"')).toBeInTheDocument()

		expect(screen.getByText('0')).toBeInTheDocument()

		expect(screen.getByText('1')).toBeInTheDocument()
	})

	it('toggles a branch open and closed on click', () => {
		renderUI(<JsonTree data={{ nested: { value: 1 } }} defaultExpandDepth={1} />)

		expect(screen.queryByText('"value"')).not.toBeInTheDocument()

		const toggle = screen.getByText('"nested"').closest('button')

		if (!toggle) throw new Error('toggle not found')

		fireEvent.click(toggle)

		expect(screen.getByText('"value"')).toBeInTheDocument()
	})

	it('shows a summary when a branch is closed', () => {
		renderUI(<JsonTree data={{ items: [1, 2, 3] }} defaultExpandDepth={1} />)

		expect(screen.getByText('3 items')).toBeInTheDocument()
	})

	describe('virtualize', () => {
		it('throws when virtualize is set without maxHeight', () => {
			expect(() => renderUI(<JsonTree data={{}} virtualize />)).toThrow(/requires `maxHeight`/)
		})

		it('mounts with data-slot="json-tree" when virtualized', () => {
			const { container } = renderUI(
				<JsonTree data={{ a: 1, b: 2 }} virtualize maxHeight="200px" />,
			)

			expect(bySlot(container, 'json-tree')).toBeInTheDocument()
		})

		it('never renders more rows than the flattened node count', () => {
			const data = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`key_${i}`, i]))
			const { container } = renderUI(
				<JsonTree data={data} virtualize maxHeight="400px" defaultExpandDepth={1} />,
			)

			// jsdom reports zero viewport, so react-virtual renders 0 items plus
			// any initial overscan. The assertion is that the row count is
			// bounded — real-browser windowing is covered by the benchmarks.
			const rows = container.querySelectorAll('[data-slot="json-node"], [data-slot="json-close"]')

			expect(rows.length).toBeLessThanOrEqual(101) // 100 leaves + 1 close
		})
	})
})

describe('json-tree: flattenTree', () => {
	const empty = new Set<string>()

	function flatten(
		data: Parameters<typeof flattenTree>[0],
		expanded: Set<string>,
		rootKey = 'root',
	) {
		const searchIndex = buildSearchIndex(data, '')
		const { value, filter } = normalizeSearch(undefined)

		return flattenTree(data, rootKey, expanded, value, filter, searchIndex)
	}

	it('emits a single branch-open row for an unopened root', () => {
		const out = flatten({ a: 1, b: 2 }, empty)

		expect(out).toHaveLength(1)
		expect(out[0]?.kind).toBe('branch-open')
	})

	it('emits branch-open + children + branch-close when a branch is open', () => {
		const out = flatten({ a: 1, b: 2 }, new Set(['root']))

		expect(out.map((n) => n.kind)).toEqual(['branch-open', 'leaf', 'leaf', 'branch-close'])
	})

	it('recurses into open nested branches', () => {
		const data = { outer: { inner: { leaf: 1 } } }
		const out = flatten(data, new Set(['root', 'root.outer', 'root.outer.inner']))

		const kinds = out.map((n) => n.kind)

		expect(kinds).toEqual([
			'branch-open',
			'branch-open',
			'branch-open',
			'leaf',
			'branch-close',
			'branch-close',
			'branch-close',
		])
	})

	it('tracks depth correctly as it descends', () => {
		const data = { outer: { inner: { leaf: 1 } } }
		const out = flatten(data, new Set(['root', 'root.outer', 'root.outer.inner']))

		expect(out.find((n) => n.kind === 'leaf')?.depth).toBe(3)
	})

	it('filters leaves when search is active with filter=true', () => {
		const searchIndex = buildSearchIndex({ a: 'yes', b: 'no' }, 'yes')
		const out = flattenTree(
			{ a: 'yes', b: 'no' },
			'root',
			new Set(['root']),
			'yes',
			true,
			searchIndex,
		)

		expect(out.filter((n) => n.kind === 'leaf')).toHaveLength(1)
	})
})

describe('json-tree: normalizeSearch', () => {
	it('returns empty defaults when search is undefined', () => {
		expect(normalizeSearch(undefined)).toEqual({ value: '', filter: false })
	})

	it('wraps a string search without enabling filter', () => {
		expect(normalizeSearch('hello')).toEqual({ value: 'hello', filter: false })
	})

	it('preserves filter when provided as an object', () => {
		expect(normalizeSearch({ value: 'x', filter: true })).toEqual({ value: 'x', filter: true })
	})

	it('defaults object filter to false when omitted', () => {
		expect(normalizeSearch({ value: 'x' })).toEqual({ value: 'x', filter: false })
	})
})

describe('json-tree: isBranch', () => {
	it('returns true for plain objects', () => {
		expect(isBranch({ a: 1 })).toBe(true)
	})

	it('returns true for arrays', () => {
		expect(isBranch([1, 2])).toBe(true)
	})

	it('returns false for primitives', () => {
		expect(isBranch('x')).toBe(false)

		expect(isBranch(1)).toBe(false)

		expect(isBranch(null)).toBe(false)
	})
})

describe('json-tree: getEntries', () => {
	it('returns indexed pairs for arrays', () => {
		expect(getEntries([10, 20])).toEqual([
			[0, 10],
			[1, 20],
		])
	})

	it('returns key/value pairs for objects', () => {
		expect(getEntries({ a: 1, b: 2 })).toEqual([
			['a', 1],
			['b', 2],
		])
	})

	it('returns an empty array for primitives', () => {
		expect(getEntries(42)).toEqual([])
	})
})

describe('json-tree: matchesSearch', () => {
	it('returns false when the term is empty', () => {
		expect(matchesSearch('key', 'value', '')).toBe(false)
	})

	it('matches on the key', () => {
		expect(matchesSearch('name', 'Alice', 'NAM')).toBe(true)
	})

	it('matches on primitive values', () => {
		expect(matchesSearch('k', 'hello world', 'WORLD')).toBe(true)
	})

	it('does not match branch values directly', () => {
		expect(matchesSearch('k', { nested: 'x' }, 'nested')).toBe(false)
	})
})

describe('json-tree: treeContainsMatch', () => {
	it('returns false when the term is empty', () => {
		expect(treeContainsMatch({ a: 1 }, '')).toBe(false)
	})

	it('finds matches deep inside nested branches', () => {
		expect(treeContainsMatch({ outer: { inner: 'needle' } }, 'needle')).toBe(true)
	})

	it('returns false when nothing matches', () => {
		expect(treeContainsMatch({ a: 'alpha', b: 'beta' }, 'zzz')).toBe(false)
	})
})

describe('json-tree: filterEntries', () => {
	it('keeps only branches that contain a match when no index is supplied', () => {
		const entries = getEntries({ a: 1, b: { deep: 'match' } })

		const result = filterEntries(entries, 'match')

		expect(result).toHaveLength(1)

		expect(result[0]?.[0]).toBe('b')
	})

	it('uses the supplied search index to decide branch inclusion', () => {
		const data = { a: 1, b: { deep: 'match' } }

		const index = buildSearchIndex(data, 'match')

		const result = filterEntries(getEntries(data), 'match', index)

		expect(result).toHaveLength(1)
	})
})

describe('json-tree: collectPaths', () => {
	it('returns an empty set for primitives', () => {
		expect(collectPaths('x')).toEqual(new Set())
	})

	it('collects all branch paths using the default root key', () => {
		const paths = collectPaths({ outer: { inner: { leaf: 1 } } })

		expect(paths.has('$')).toBe(true)

		expect(paths.has('$.outer')).toBe(true)

		expect(paths.has('$.outer.inner')).toBe(true)
	})

	it('honors the max depth limit', () => {
		const paths = collectPaths({ outer: { inner: { leaf: 1 } } }, 'root', 1)

		expect(paths.has('root')).toBe(true)

		expect(paths.has('root.outer')).toBe(false)
	})

	it('uses the provided root key', () => {
		const paths = collectPaths({ a: { b: 1 } }, 'top')

		expect(paths.has('top')).toBe(true)

		expect(paths.has('top.a')).toBe(true)
	})
})

describe('json-tree: valueType', () => {
	it('returns "null" for null', () => {
		expect(valueType(null)).toBe('null')
	})

	it('returns "string" for strings', () => {
		expect(valueType('x')).toBe('string')
	})

	it('returns "number" for numbers', () => {
		expect(valueType(1)).toBe('number')
	})

	it('returns "boolean" for booleans', () => {
		expect(valueType(true)).toBe('boolean')
	})
})

describe('JsonNodeRow', () => {
	it('renders a leaf node with its key and value', () => {
		const { container } = renderUI(
			<JsonNodeRow
				node={{
					kind: 'leaf',
					path: 'root.a',
					keyName: 'a',
					value: 1,
					depth: 1,
					highlighted: false,
				}}
				onToggle={() => {}}
			/>,
		)

		expect(bySlot(container, 'json-node')).toBeInTheDocument()

		expect(screen.getByText('"a"')).toBeInTheDocument()

		expect(screen.getByText('1')).toBeInTheDocument()
	})

	it('marks the root leaf as focusable', () => {
		const { container } = renderUI(
			<JsonNodeRow
				node={{
					kind: 'leaf',
					path: 'root',
					keyName: undefined,
					value: 1,
					depth: 0,
					highlighted: false,
				}}
				onToggle={() => {}}
			/>,
		)

		const node = bySlot(container, 'json-node')

		expect(node).toHaveAttribute('tabindex', '0')
	})

	it('marks deeper leaves as not tab-navigable', () => {
		const { container } = renderUI(
			<JsonNodeRow
				node={{
					kind: 'leaf',
					path: 'root.a',
					keyName: 'a',
					value: 1,
					depth: 1,
					highlighted: false,
				}}
				onToggle={() => {}}
			/>,
		)

		expect(bySlot(container, 'json-node')).toHaveAttribute('tabindex', '-1')
	})

	it('renders a branch-close row with the matching bracket for an array', () => {
		const { container } = renderUI(
			<JsonNodeRow
				node={{ kind: 'branch-close', path: 'root.a', depth: 1, value: [1, 2] }}
				onToggle={() => {}}
			/>,
		)

		const close = bySlot(container, 'json-close')

		expect(close).toBeInTheDocument()

		expect(close?.textContent).toContain(']')
	})

	it('renders a branch-close row with the matching bracket for an object', () => {
		const { container } = renderUI(
			<JsonNodeRow
				node={{ kind: 'branch-close', path: 'root.a', depth: 1, value: { x: 1 } }}
				onToggle={() => {}}
			/>,
		)

		expect(bySlot(container, 'json-close')?.textContent).toContain('}')
	})

	it('renders a closed branch-open row with summary and closing bracket when count > 0', () => {
		const { container } = renderUI(
			<JsonNodeRow
				node={{
					kind: 'branch-open',
					path: 'root',
					keyName: undefined,
					value: [1, 2, 3],
					depth: 0,
					open: false,
					count: 3,
					highlighted: false,
				}}
				onToggle={() => {}}
			/>,
		)

		const toggle = bySlot(container, 'json-node-toggle')

		expect(toggle).toHaveAttribute('aria-expanded', 'false')

		expect(screen.getByText('3 items')).toBeInTheDocument()

		expect(container.textContent).toContain(']')
	})

	it('renders a closed branch-open row without a summary when count = 0', () => {
		const { container } = renderUI(
			<JsonNodeRow
				node={{
					kind: 'branch-open',
					path: 'root',
					keyName: undefined,
					value: {},
					depth: 0,
					open: false,
					count: 0,
					highlighted: false,
				}}
				onToggle={() => {}}
			/>,
		)

		expect(screen.queryByText(/item/)).not.toBeInTheDocument()

		expect(container.textContent).toContain('}')
	})

	it('pluralises the summary for exactly one item', () => {
		renderUI(
			<JsonNodeRow
				node={{
					kind: 'branch-open',
					path: 'root',
					keyName: undefined,
					value: [1],
					depth: 0,
					open: false,
					count: 1,
					highlighted: false,
				}}
				onToggle={() => {}}
			/>,
		)

		expect(screen.getByText('1 item')).toBeInTheDocument()
	})

	it('calls onToggle with the node path when the toggle is clicked', () => {
		const onToggle = vi.fn()

		const { container } = renderUI(
			<JsonNodeRow
				node={{
					kind: 'branch-open',
					path: 'root.a',
					keyName: 'a',
					value: { x: 1 },
					depth: 1,
					open: false,
					count: 1,
					highlighted: false,
				}}
				onToggle={onToggle}
			/>,
		)

		const toggle = bySlot(container, 'json-node-toggle') as HTMLButtonElement

		fireEvent.click(toggle)

		expect(onToggle).toHaveBeenCalledWith('root.a')
	})

	it('sets data-open when the branch is open and omits the summary', () => {
		const { container } = renderUI(
			<JsonNodeRow
				node={{
					kind: 'branch-open',
					path: 'root',
					keyName: undefined,
					value: { a: 1 },
					depth: 0,
					open: true,
					count: 1,
					highlighted: false,
				}}
				onToggle={() => {}}
			/>,
		)

		expect(bySlot(container, 'json-node-toggle')).toHaveAttribute('data-open')

		expect(screen.queryByText('1 item')).not.toBeInTheDocument()
	})
})
