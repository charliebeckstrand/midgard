import { type ReactElement, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { JsonTree } from '../../components/json-tree'
import { flatTreeMoveTarget } from '../../components/json-tree/json-tree-keyboard'
import { JsonTreeNodeRow } from '../../components/json-tree/json-tree-node-row'
import { flattenTree } from '../../components/json-tree/json-tree-utilities'
import { bySlot, fireEvent, getSlot, present, renderUI, screen } from '../helpers'

describe('JsonTree', () => {
	it('renders with data-slot="json-tree" and role="tree"', () => {
		const { container } = renderUI(<JsonTree data={{}} />)

		const el = bySlot(container, 'json-tree')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('role', 'tree')
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

	it('escapes quotes and control characters in keys and string values', () => {
		const { container } = renderUI(
			<JsonTree data={{ 'say "hi"': 'line one\nline "two"' }} defaultExpandDepth={1} />,
		)

		const leaf = container.querySelector('[role="treeitem"][aria-level="2"]')

		expect(leaf).toHaveTextContent('"say \\"hi\\"":"line one\\nline \\"two\\""', {
			normalizeWhitespace: false,
		})
	})

	it('toggles a branch open and closed on click', () => {
		renderUI(<JsonTree data={{ nested: { value: 1 } }} defaultExpandDepth={1} />)

		expect(screen.queryByText('"value"')).not.toBeInTheDocument()

		const toggle = screen.getByText('"nested"').closest('button')

		if (!toggle) throw new Error('toggle not found')

		fireEvent.click(toggle)

		expect(screen.getByText('"value"')).toBeInTheDocument()
	})

	it('restores a descendant expansion after its ancestor is collapsed and reopened', () => {
		renderUI(<JsonTree data={{ outer: { inner: { leaf: 1 } } }} defaultExpandDepth={2} />)

		const inner = screen.getByText('"inner"').closest('button')

		if (!inner) throw new Error('inner toggle not found')

		fireEvent.click(inner)

		expect(screen.getByText('"leaf"')).toBeInTheDocument()

		const outer = screen.getByText('"outer"').closest('button')

		if (!outer) throw new Error('outer toggle not found')

		// Collapsing unmounts every descendant, so a node holding its expansion
		// only in local state loses it. The tree-level memory outlives the unmount.
		fireEvent.click(outer)

		fireEvent.click(outer)

		expect(screen.getByText('"leaf"')).toBeInTheDocument()
	})

	it('shows a summary when a branch is closed', () => {
		renderUI(<JsonTree data={{ items: [1, 2, 3] }} defaultExpandDepth={1} />)

		expect(screen.getByText('3 items')).toBeInTheDocument()
	})

	it('calls onExpandedChange when controlled and a branch is toggled', () => {
		const onExpandedChange = vi.fn()

		// The root path is '$'; include it so the nested branch header renders.
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

	it('stays read-only when controlled without onExpandedChange', () => {
		const expanded = new Set<string>(['$'])

		const { rerender } = renderUI(<JsonTree data={{ nested: { value: 1 } }} expanded={expanded} />)

		const toggle = screen.getByText('"nested"').closest('button')

		if (!toggle) throw new Error('toggle not found')

		// Click is a no-op (controlled input with no onChange) and must not bank
		// local state that would apply once the consumer drops `expanded`.
		fireEvent.click(toggle)

		expect(screen.queryByText('"value"')).not.toBeInTheDocument()

		rerender(<JsonTree data={{ nested: { value: 1 } }} />)

		// Uncontrolled now: the depth default keeps `nested` closed. The dead
		// click previously banked userOpen=true, springing the branch open here.
		expect(screen.queryByText('"value"')).not.toBeInTheDocument()
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

	it('seeds the branches containing a match into a controlled set', () => {
		const onExpandedChange = vi.fn()

		renderUI(
			<JsonTree
				data={{ outer: { inner: { needle: 'match' } }, other: { value: 1 } }}
				search="needle"
				expanded={new Set()}
				onExpandedChange={onExpandedChange}
			/>,
		)

		expect(onExpandedChange).toHaveBeenCalledOnce()

		expect(onExpandedChange.mock.calls[0]?.[0]).toEqual(new Set(['$', '$.outer', '$.outer.inner']))
	})

	it('opens a match of a controlled tree once the owner takes the seed', () => {
		function Owner() {
			const [expanded, setExpanded] = useState(() => new Set<string>())

			return (
				<JsonTree
					data={{ outer: { needle: 'match' } }}
					search="needle"
					expanded={expanded}
					onExpandedChange={setExpanded}
				/>
			)
		}

		renderUI(<Owner />)

		expect(screen.getByText('"needle"')).toBeInTheDocument()
	})

	it('does not report a search seed that adds no branch to a controlled set', () => {
		const onExpandedChange = vi.fn()

		renderUI(
			<JsonTree
				data={{ outer: { needle: 'match' } }}
				search="needle"
				expanded={new Set(['$', '$.outer'])}
				onExpandedChange={onExpandedChange}
			/>,
		)

		expect(onExpandedChange).not.toHaveBeenCalled()
	})

	it('collapses branches without matches when filter + search produces no entries', () => {
		renderUI(
			<JsonTree data={{ outer: { value: 'noop' } }} search={{ value: 'zzz', filter: true }} />,
		)

		expect(screen.queryByText('"value"')).not.toBeInTheDocument()
	})

	it.each([
		['string', 'Ada', '"Ada"'],
		['number', 42, '42'],
		['boolean', true, 'true'],
		['null', null, 'null'],
	] as const)('renders a %s root as a single leaf row', (_type, data, text) => {
		renderUI(<JsonTree data={data} />)

		expect(screen.getByText(text)).toBeInTheDocument()
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
		it.each<[string, () => ReactElement]>([
			[
				'mounts with data-slot="json-tree" when virtualized',
				() => <JsonTree data={{ a: 1, b: 2 }} virtualize={{ maxHeight: '200px' }} />,
			],
			[
				'mounts virtualized with a custom estimateSize and overscan',
				() => (
					<JsonTree
						data={{ a: 1, b: 2 }}
						virtualize={{ maxHeight: '200px', estimateSize: 40, overscan: 5 }}
					/>
				),
			],
			[
				'mounts virtualized with a controlled expanded set',
				() => (
					<JsonTree
						data={{ a: 1 }}
						virtualize={{ maxHeight: '200px' }}
						expanded={new Set(['$'])}
						onExpandedChange={() => {}}
					/>
				),
			],
			[
				'mounts virtualized with an active search term',
				() => (
					<JsonTree
						data={{ outer: { needle: 'match' } }}
						virtualize={{ maxHeight: '200px' }}
						search={{ value: 'needle', filter: true }}
					/>
				),
			],
		])('%s', (_name, ui) => {
			const { container } = renderUI(ui())

			expect(bySlot(container, 'json-tree')).toBeInTheDocument()
		})

		// The uncontrolled arm resolves search matches per render, and the hook
		// tests cover it. A controlled tree takes the matches as one seed.
		it('seeds the branches containing a match into a controlled set', () => {
			const onExpandedChange = vi.fn()

			// jsdom's zero-size viewport renders no rows, so the expansion seeding
			// is observed through onExpandedChange rather than the DOM.
			renderUI(
				<JsonTree
					data={{ outer: { inner: { needle: 'match' } } }}
					virtualize={{ maxHeight: '200px' }}
					search={{ value: 'needle' }}
					expanded={new Set()}
					onExpandedChange={onExpandedChange}
				/>,
			)

			const seeded = onExpandedChange.mock.calls.at(-1)?.[0] as Set<string>

			expect(seeded).toBeDefined()

			expect(seeded.has('$.outer')).toBe(true)

			expect(seeded.has('$.outer.inner')).toBe(true)
		})

		// B06-C14: the seed adds nothing to a fully expanded set, so the tree
		// must not report a change.
		it('does not report a search seed that adds no branch', () => {
			const onExpandedChange = vi.fn()

			renderUI(
				<JsonTree
					data={{ outer: { needle: 'match' } }}
					virtualize={{ maxHeight: '200px' }}
					search={{ value: 'needle' }}
					expanded={new Set(['$', '$.outer'])}
					onExpandedChange={onExpandedChange}
				/>,
			)

			expect(onExpandedChange).not.toHaveBeenCalled()
		})

		it('seeds the matches of new data under the same term', () => {
			const onExpandedChange = vi.fn()

			const expanded = new Set<string>(['$', '$.outer'])

			const { rerender } = renderUI(
				<JsonTree
					data={{ outer: { needle: 'match' } }}
					virtualize={{ maxHeight: '200px' }}
					search={{ value: 'needle' }}
					expanded={expanded}
					onExpandedChange={onExpandedChange}
				/>,
			)

			expect(onExpandedChange).not.toHaveBeenCalled()

			rerender(
				<JsonTree
					data={{ other: { needle: 'match' } }}
					virtualize={{ maxHeight: '200px' }}
					search={{ value: 'needle' }}
					expanded={expanded}
					onExpandedChange={onExpandedChange}
				/>,
			)

			const seeded = onExpandedChange.mock.calls.at(-1)?.[0] as Set<string>

			expect(seeded).toBeDefined()

			expect(seeded.has('$.other')).toBe(true)
		})

		it('seeds again when the reader types the same term after a clear', () => {
			const onExpandedChange = vi.fn()

			const data = { outer: { needle: 'match' } }

			const tree = (search: string) => (
				<JsonTree
					data={data}
					virtualize={{ maxHeight: '200px' }}
					search={search}
					expanded={new Set()}
					onExpandedChange={onExpandedChange}
				/>
			)

			const { rerender } = renderUI(tree('needle'))

			expect(onExpandedChange).toHaveBeenCalledOnce()

			rerender(tree(''))

			rerender(tree('needle'))

			expect(onExpandedChange).toHaveBeenCalledTimes(2)
		})

		it('does not report expansion from an uncontrolled tree', () => {
			const onExpandedChange = vi.fn()

			renderUI(
				<JsonTree
					data={{ outer: { needle: 'match' } }}
					virtualize={{ maxHeight: '200px' }}
					search={{ value: 'needle' }}
					onExpandedChange={onExpandedChange}
				/>,
			)

			expect(onExpandedChange).not.toHaveBeenCalled()
		})

		it('never renders more rows than the flattened node count', () => {
			const data = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`key_${i}`, i]))

			const { container } = renderUI(
				<JsonTree data={data} virtualize={{ maxHeight: '400px' }} defaultExpandDepth={1} />,
			)

			// jsdom reports zero viewport; react-virtual renders 0 items plus
			// any initial overscan. Row count is bounded by the node count.
			const rows = container.querySelectorAll('[data-slot="json-node"], [data-slot="json-close"]')

			expect(rows.length).toBeLessThanOrEqual(101) // 100 leaves + 1 close
		})
	})
})

describe('JsonTreeNodeRow', () => {
	it('renders a deeper leaf node with its key and value, out of the Tab order', () => {
		const { container } = renderUI(
			<JsonTreeNodeRow
				index={0}
				node={{
					type: 'leaf',
					path: 'root.a',
					keyName: 'a',
					value: 1,
					depth: 1,
					setSize: 1,
					posInSet: 1,
					highlighted: false,
				}}
				onToggle={() => {}}
			/>,
		)

		expect(bySlot(container, 'json-node')).toBeInTheDocument()

		expect(screen.getByText('"a"')).toBeInTheDocument()

		expect(screen.getByText('1')).toBeInTheDocument()

		expect(bySlot(container, 'json-node')).toHaveAttribute('tabindex', '-1')
	})

	it('marks the root leaf as focusable', () => {
		const { container } = renderUI(
			<JsonTreeNodeRow
				index={0}
				node={{
					type: 'leaf',
					path: 'root',
					keyName: undefined,
					value: 1,
					depth: 0,
					setSize: 1,
					posInSet: 1,
					highlighted: false,
				}}
				onToggle={() => {}}
			/>,
		)

		const node = bySlot(container, 'json-node')

		expect(node).toHaveAttribute('tabindex', '0')
	})

	it.each([
		['an array', [1, 2], ']'],
		['an object', { x: 1 }, '}'],
	])('renders a branch-close row with the matching bracket for %s', (_name, value, bracket) => {
		const { container } = renderUI(
			<JsonTreeNodeRow
				index={0}
				node={{ type: 'branch-close', path: 'root.a', depth: 1, value }}
				onToggle={() => {}}
			/>,
		)

		expect(getSlot(container, 'json-close').textContent).toContain(bracket)
	})

	it('renders a closed branch-open row with summary and closing bracket when count > 0', () => {
		const { container } = renderUI(
			<JsonTreeNodeRow
				index={0}
				node={{
					type: 'branch-open',
					path: 'root',
					keyName: undefined,
					value: [1, 2, 3],
					depth: 0,
					setSize: 1,
					posInSet: 1,
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
				index={0}
				node={{
					type: 'branch-open',
					path: 'root',
					keyName: undefined,
					value: {},
					depth: 0,
					setSize: 1,
					posInSet: 1,
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

	it('pluralizes the summary for exactly one item', () => {
		renderUI(
			<JsonTreeNodeRow
				index={0}
				node={{
					type: 'branch-open',
					path: 'root',
					keyName: undefined,
					value: [1],
					depth: 0,
					setSize: 1,
					posInSet: 1,
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
				index={0}
				node={{
					type: 'branch-open',
					path: 'root.a',
					keyName: 'a',
					value: { x: 1 },
					depth: 1,
					setSize: 1,
					posInSet: 1,
					open: false,
					count: 1,
					highlighted: false,
				}}
				onToggle={onToggle}
			/>,
		)

		const toggle = getSlot<HTMLButtonElement>(container, 'json-node-toggle')

		fireEvent.click(toggle)

		expect(onToggle).toHaveBeenCalledWith('root.a')
	})

	it('sets data-open when the branch is open and omits the summary', () => {
		const { container } = renderUI(
			<JsonTreeNodeRow
				index={0}
				node={{
					type: 'branch-open',
					path: 'root',
					keyName: undefined,
					value: { a: 1 },
					depth: 0,
					setSize: 1,
					posInSet: 1,
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

describe('JsonTreeNodeRow tab stop', () => {
	it('carries the Tab stop on a windowed non-root row when tabbable', () => {
		// With virtualization the depth-0 root can scroll out of the DOM; the
		// stop must be assignable to whichever rendered row comes first.
		const { container, rerender } = renderUI(
			<JsonTreeNodeRow
				index={0}
				node={{
					type: 'leaf',
					path: 'r.a.b',
					keyName: 'b',
					value: 1,
					depth: 2,
					highlighted: false,
					setSize: 1,
					posInSet: 1,
				}}
				onToggle={() => {}}
				tabbable
			/>,
		)

		expect(container.querySelector('[role="treeitem"]')).toHaveAttribute('tabindex', '0')

		rerender(
			<JsonTreeNodeRow
				index={0}
				node={{
					type: 'leaf',
					path: 'r.a.b',
					keyName: 'b',
					value: 1,
					depth: 2,
					highlighted: false,
					setSize: 1,
					posInSet: 1,
				}}
				onToggle={() => {}}
			/>,
		)

		expect(container.querySelector('[role="treeitem"]')).toHaveAttribute('tabindex', '-1')
	})
})

describe('JsonTree virtualized set position', () => {
	it('gives each flat row its sibling count and its position', () => {
		const nodes = flattenTree({
			data: { a: 1, b: { c: 2 } },
			rootKey: undefined,
			isOpen: () => true,
			search: '',
			filter: false,
			searchIndex: new WeakMap(),
		})

		const positions = nodes.flatMap((node) =>
			node.type === 'branch-close' ? [] : [[node.path, node.posInSet, node.setSize]],
		)

		expect(positions).toEqual([
			['$', 1, 1],
			['$.a', 1, 2],
			['$.b', 2, 2],
			['$.b.c', 1, 1],
		])
	})

	it('counts only the siblings that a filtered search keeps', () => {
		const nodes = flattenTree({
			data: { hit: 1, miss: 2, also_hit: 3 },
			rootKey: undefined,
			isOpen: () => true,
			search: 'hit',
			filter: true,
			searchIndex: new WeakMap(),
		})

		const positions = nodes.flatMap((node) =>
			node.type === 'leaf' ? [[node.path, node.posInSet, node.setSize]] : [],
		)

		expect(positions).toEqual([
			['$.hit', 1, 2],
			['$.also_hit', 2, 2],
		])
	})

	it.each([
		[
			'leaf',
			{
				type: 'leaf',
				path: '$.b',
				keyName: 'b',
				value: 1,
				depth: 1,
				highlighted: false,
				setSize: 3,
				posInSet: 2,
			},
		],
		[
			'branch',
			{
				type: 'branch-open',
				path: '$.b',
				keyName: 'b',
				value: { x: 1 },
				depth: 1,
				open: false,
				count: 1,
				highlighted: false,
				setSize: 3,
				posInSet: 2,
			},
		],
	] as const)('puts aria-setsize and aria-posinset on a %s row', (_name, node) => {
		const { container } = renderUI(<JsonTreeNodeRow index={0} node={node} onToggle={() => {}} />)

		const item = container.querySelector('[role="treeitem"]')

		expect(item).toHaveAttribute('aria-setsize', '3')

		expect(item).toHaveAttribute('aria-posinset', '2')
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

describe('JsonTree horizontal arrows', () => {
	function rows(container: HTMLElement) {
		return Array.from(container.querySelectorAll<HTMLElement>('[role="treeitem"]'))
	}

	function key(container: HTMLElement, name: string) {
		fireEvent.keyDown(present(document.activeElement, 'focused row'), { key: name })

		return rows(container)
	}

	// jsdom renders no windowed rows; the browser suite covers the windowed tree.
	it('opens, closes, and moves to the child or parent', () => {
		const { container } = renderUI(
			<JsonTree data={{ outer: { inner: 1 } }} defaultExpandDepth={1} />,
		)

		const [root, outer] = rows(container)

		present(root, 'root row').focus()

		// An open branch: ArrowRight moves to its first child.
		key(container, 'ArrowRight')

		expect(document.activeElement).toBe(outer)

		// A closed branch: ArrowRight opens it, and focus stays.
		key(container, 'ArrowRight')

		expect(document.activeElement).toHaveAttribute('aria-expanded', 'true')

		expect(document.activeElement).toHaveTextContent('outer')

		// Now open: ArrowRight moves to the leaf.
		key(container, 'ArrowRight')

		expect(document.activeElement).toHaveAttribute('aria-level', '3')

		// A leaf: ArrowLeft moves to its parent.
		key(container, 'ArrowLeft')

		expect(document.activeElement).toHaveAttribute('aria-level', '2')

		// An open branch: ArrowLeft closes it, and focus stays.
		key(container, 'ArrowLeft')

		expect(document.activeElement).toHaveAttribute('aria-expanded', 'false')

		// A closed branch: ArrowLeft moves to its parent.
		key(container, 'ArrowLeft')

		expect(document.activeElement).toHaveAttribute('aria-level', '1')

		// The root has no parent: ArrowLeft closes it, then does nothing.
		key(container, 'ArrowLeft')

		key(container, 'ArrowLeft')

		expect(document.activeElement).toHaveAttribute('aria-level', '1')
	})

	it('swaps the arrows in a right-to-left layout', () => {
		const { container } = renderUI(
			<div dir="rtl" style={{ direction: 'rtl' }}>
				<JsonTree data={{ outer: { inner: 1 } }} defaultExpandDepth={1} />
			</div>,
		)

		const [root, outer] = rows(container)

		present(root, 'root row').focus()

		key(container, 'ArrowLeft')

		expect(document.activeElement).toBe(outer)

		key(container, 'ArrowRight')

		expect(document.activeElement).toBe(root)
	})
})

describe('flatTreeMoveTarget', () => {
	const nodes = flattenTree({
		data: { a: { b: 1 }, c: [], d: { e: 1 } },
		rootKey: undefined,
		isOpen: (path) => path !== '$.d',
		search: '',
		filter: false,
		searchIndex: new WeakMap(),
	})

	const indexOf = (type: string, path: string) =>
		nodes.findIndex((node) => node.type === type && node.path === path)

	it('reaches the first child of an open branch', () => {
		expect(flatTreeMoveTarget(nodes, indexOf('branch-open', '$.a'), 'child')).toBe(
			indexOf('leaf', '$.a.b'),
		)
	})

	it('reaches the parent of a leaf and of a closed branch', () => {
		expect(flatTreeMoveTarget(nodes, indexOf('leaf', '$.a.b'), 'parent')).toBe(
			indexOf('branch-open', '$.a'),
		)

		expect(flatTreeMoveTarget(nodes, indexOf('branch-open', '$.d'), 'parent')).toBe(
			indexOf('branch-open', '$'),
		)
	})

	it('has no target past the root or into an empty branch', () => {
		expect(flatTreeMoveTarget(nodes, indexOf('branch-open', '$'), 'parent')).toBeNull()

		expect(flatTreeMoveTarget(nodes, indexOf('branch-open', '$.c'), 'child')).toBeNull()
	})

	it('finds every row it names', () => {
		expect(['$', '$.a', '$.c', '$.d'].map((path) => indexOf('branch-open', path))).not.toContain(-1)

		expect(indexOf('leaf', '$.a.b')).not.toBe(-1)
	})
})
