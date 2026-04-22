import { describe, expect, it } from 'vitest'
import { JsonTree } from '../../components/json-tree'
import {
	buildSearchIndex,
	flattenTree,
	normalizeSearch,
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
