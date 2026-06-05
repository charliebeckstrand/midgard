import { describe, expect, it, vi } from 'vitest'
import { JsonTree } from '../../components/json-tree'
import { JsonTreeNodeRow } from '../../components/json-tree/json-tree-node-row'
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

	it('calls onExpandedChange when controlled and a branch is toggled', () => {
		const onExpandedChange = vi.fn()

		// The root path is '$' — include it so the nested branch header renders.
		const expanded = new Set<string>(['$'])

		renderUI(
			<JsonTree
				data={{ nested: { value: 1 } }}
				expanded={expanded}
				onExpandedChange={onExpandedChange}
			/>,
		)

		const toggle = screen.getByText('"nested"').closest('button')

		if (!toggle) throw new Error('toggle not found')

		fireEvent.click(toggle)

		expect(onExpandedChange).toHaveBeenCalledOnce()

		const next = onExpandedChange.mock.calls[0]?.[0] as Set<string>

		expect(next.has('$.nested')).toBe(true)
	})

	it('reflects the controlled expanded set on render', () => {
		const expanded = new Set<string>(['$', '$.nested'])

		renderUI(
			<JsonTree data={{ nested: { value: 1 } }} expanded={expanded} onExpandedChange={() => {}} />,
		)

		expect(screen.getByText('"value"')).toBeInTheDocument()
	})

	it('auto-expands matching branches when search is active without filter', () => {
		renderUI(<JsonTree data={{ outer: { needle: 'match' } }} search="needle" />)

		// Without expansion the inner "needle" key wouldn't be in the DOM.
		expect(screen.getByText('"needle"')).toBeInTheDocument()
	})

	it('collapses branches without matches when filter + search produces no entries', () => {
		renderUI(
			<JsonTree data={{ outer: { value: 'noop' } }} search={{ value: 'zzz', filter: true }} />,
		)

		expect(screen.queryByText('"value"')).not.toBeInTheDocument()
	})

	it('renders a primitive string root as a single leaf row', () => {
		renderUI(<JsonTree data="Ada" />)

		expect(screen.getByText('"Ada"')).toBeInTheDocument()
	})

	it('renders a primitive number root as a single leaf row', () => {
		renderUI(<JsonTree data={42} />)

		expect(screen.getByText('42')).toBeInTheDocument()
	})

	it('renders a primitive boolean root as a single leaf row', () => {
		renderUI(<JsonTree data={true} />)

		expect(screen.getByText('true')).toBeInTheDocument()
	})

	it('renders a null root as a single leaf row', () => {
		renderUI(<JsonTree data={null} />)

		expect(screen.getByText('null')).toBeInTheDocument()
	})

	it('renders an array root with index keys when expanded', () => {
		renderUI(<JsonTree data={[10, 20]} defaultExpandDepth={1} />)

		// Array indices render without quotes.
		expect(screen.getByText('0')).toBeInTheDocument()

		expect(screen.getByText('10')).toBeInTheDocument()

		expect(screen.getByText('20')).toBeInTheDocument()
	})

	it('toggles an array open and closed via its branch header', () => {
		renderUI(<JsonTree data={{ items: [1, 2, 3] }} defaultExpandDepth={1} />)

		const toggle = screen.getByText('"items"').closest('button')

		if (!toggle) throw new Error('toggle not found')

		// Initially closed at depth 1.
		expect(screen.queryByText('1')).not.toBeInTheDocument()

		fireEvent.click(toggle)

		// Each numeric index 0/1/2 appears once expanded.
		expect(screen.getByText('0')).toBeInTheDocument()

		fireEvent.click(toggle)

		expect(screen.queryByText('0')).not.toBeInTheDocument()
	})

	it('highlights a matching key when a search term is active without filter', () => {
		const { container } = renderUI(
			<JsonTree data={{ needle: 'value' }} defaultExpandDepth={1} search="needle" />,
		)

		// The branch header carrying the matching key is flagged via data-highlighted.
		const highlighted = container.querySelector('[data-highlighted]')

		expect(highlighted).toBeInTheDocument()
	})

	it('hides non-branch leaves that do not match the filtered search term', () => {
		renderUI(
			<JsonTree
				data={{ name: 'Ada', age: 42 }}
				defaultExpandDepth={1}
				search={{ value: 'Ada', filter: true }}
			/>,
		)

		expect(screen.getByText('"Ada"')).toBeInTheDocument()

		expect(screen.queryByText('42')).not.toBeInTheDocument()
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

		it('mounts virtualized with a custom estimateSize and overscan', () => {
			const { container } = renderUI(
				<JsonTree
					data={{ a: 1, b: 2 }}
					virtualize={{ estimateSize: 40, overscan: 5 }}
					maxHeight="200px"
				/>,
			)

			expect(bySlot(container, 'json-tree')).toBeInTheDocument()
		})

		it('mounts virtualized with a controlled expanded set', () => {
			const onExpandedChange = vi.fn()

			const { container } = renderUI(
				<JsonTree
					data={{ a: 1 }}
					virtualize
					maxHeight="200px"
					expanded={new Set(['$'])}
					onExpandedChange={onExpandedChange}
				/>,
			)

			expect(bySlot(container, 'json-tree')).toBeInTheDocument()
		})

		it('mounts virtualized with an active search term', () => {
			const { container } = renderUI(
				<JsonTree
					data={{ outer: { needle: 'match' } }}
					virtualize
					maxHeight="200px"
					search={{ value: 'needle', filter: true }}
				/>,
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

describe('JsonTreeNodeRow', () => {
	it('renders a leaf node with its key and value', () => {
		const { container } = renderUI(
			<JsonTreeNodeRow
				node={{
					type: 'leaf',
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
			<JsonTreeNodeRow
				node={{
					type: 'leaf',
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
			<JsonTreeNodeRow
				node={{
					type: 'leaf',
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
			<JsonTreeNodeRow
				node={{ type: 'branch-close', path: 'root.a', depth: 1, value: [1, 2] }}
				onToggle={() => {}}
			/>,
		)

		const close = bySlot(container, 'json-close')

		expect(close).toBeInTheDocument()

		expect(close?.textContent).toContain(']')
	})

	it('renders a branch-close row with the matching bracket for an object', () => {
		const { container } = renderUI(
			<JsonTreeNodeRow
				node={{ type: 'branch-close', path: 'root.a', depth: 1, value: { x: 1 } }}
				onToggle={() => {}}
			/>,
		)

		expect(bySlot(container, 'json-close')?.textContent).toContain('}')
	})

	it('renders a closed branch-open row with summary and closing bracket when count > 0', () => {
		const { container } = renderUI(
			<JsonTreeNodeRow
				node={{
					type: 'branch-open',
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
			<JsonTreeNodeRow
				node={{
					type: 'branch-open',
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
			<JsonTreeNodeRow
				node={{
					type: 'branch-open',
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
			<JsonTreeNodeRow
				node={{
					type: 'branch-open',
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
			<JsonTreeNodeRow
				node={{
					type: 'branch-open',
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

describe('JsonTree tree semantics', () => {
	it('sets aria-level on leaf treeitems by depth', () => {
		const { container } = renderUI(
			<JsonTree data={{ outer: { inner: 1 } }} defaultExpandDepth={5} />,
		)

		const leaf = container.querySelector('[role="treeitem"][data-slot="json-node"]')

		// outer (level 1) > inner object (level 2) > leaf "inner: 1" (level 3)
		expect(leaf).toHaveAttribute('aria-level', '3')
	})

	it('groups nested treeitems under role="group"', () => {
		const { container } = renderUI(<JsonTree data={{ outer: 1 }} defaultExpandDepth={5} />)

		expect(container.querySelector('[data-slot="json-group"]')).toHaveAttribute('role', 'group')
	})

	it('hides the closing-bracket row from assistive tech', () => {
		const { container } = renderUI(<JsonTree data={{ outer: 1 }} defaultExpandDepth={5} />)

		expect(bySlot(container, 'json-close')).toHaveAttribute('aria-hidden', 'true')
	})
})
