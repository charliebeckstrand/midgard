import { fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Tree, TreeItem, TreeSkeleton } from '../../components/tree'
import { bySlot, getSlot, present, renderUI, screen } from '../helpers'
import { axe } from '../helpers/axe'

describe('Tree', () => {
	it('announces sibling position via aria-posinset/aria-setsize', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="src" defaultOpen>
					<TreeItem label="a.ts" />
					<TreeItem label="b.ts" />
					<TreeItem label="c.ts" />
				</TreeItem>
				<TreeItem label="README" />
			</Tree>,
		)

		const items = container.querySelectorAll('[role="treeitem"]')

		// Roots: 1 of 2 and 2 of 2; nested: 2 of 3 for b.ts.
		expect(items[0]).toHaveAttribute('aria-posinset', '1')

		expect(items[0]).toHaveAttribute('aria-setsize', '2')

		const b = Array.from(items).find((el) => el.textContent?.includes('b.ts'))

		expect(b).toHaveAttribute('aria-posinset', '2')

		expect(b).toHaveAttribute('aria-setsize', '3')
	})

	// A Fragment adds no level: its items are rendered siblings of the items
	// around it, at the root and inside a branch.
	it('counts the items inside a Fragment as siblings', () => {
		const sources = (
			<>
				<TreeItem label="a.ts" />
				<TreeItem label="b.ts" />
			</>
		)

		const notices = (
			<>
				<TreeItem label="README" />
				<TreeItem label="LICENSE" />
			</>
		)

		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="src" defaultOpen>
					{sources}
					<TreeItem label="c.ts" />
				</TreeItem>
				{notices}
			</Tree>,
		)

		const byLabel = (label: string) =>
			Array.from(container.querySelectorAll('[role="treeitem"]')).find(
				(el) => el.textContent === label,
			)

		const expected: Array<[string, string, string]> = [
			['a.ts', '1', '3'],
			['b.ts', '2', '3'],
			['c.ts', '3', '3'],
			['README', '2', '3'],
			['LICENSE', '3', '3'],
		]

		for (const [label, posinset, setsize] of expected) {
			expect(byLabel(label)).toHaveAttribute('aria-posinset', posinset)

			expect(byLabel(label)).toHaveAttribute('aria-setsize', setsize)
		}
	})

	// A false child renders nothing, so it is not a sibling and does not count.
	it('skips a false child in the count', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				{false}
				<TreeItem label="a.ts" />
				<TreeItem label="b.ts" />
			</Tree>,
		)

		const items = container.querySelectorAll('[role="treeitem"]')

		expect(items[0]).toHaveAttribute('aria-posinset', '1')

		expect(items[1]).toHaveAttribute('aria-setsize', '2')
	})

	it('drops a branch subtree while closed under the default mount policy', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="src" defaultOpen>
					<TreeItem label="a.ts" />
				</TreeItem>
			</Tree>,
		)

		fireEvent.click(screen.getByText('src'))

		expect(container.textContent).not.toContain('a.ts')
	})

	it('keeps a nested expansion across a parent collapse under mount="lazy"', () => {
		renderUI(
			<Tree aria-label="Files" mount="lazy">
				<TreeItem label="src" defaultOpen>
					<TreeItem label="nested">
						<TreeItem label="deep.ts" />
					</TreeItem>
				</TreeItem>
			</Tree>,
		)

		fireEvent.click(screen.getByText('nested'))

		expect(screen.getByText('deep.ts')).toBeInTheDocument()

		// Under `active` this collapse unmounts `nested`, taking its uncontrolled
		// open state with it, and reopening `src` shows it closed again. Held, the
		// subtree stays mounted and keeps that state.
		fireEvent.click(screen.getByText('src'))

		fireEvent.click(screen.getByText('src'))

		expect(screen.getByText('deep.ts')).toBeInTheDocument()
	})

	it('renders with data-slot="tree", role="tree", and the required accessible name', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Item 1" />
			</Tree>,
		)

		const el = bySlot(container, 'tree')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('role', 'tree')

		expect(screen.getByRole('tree')).toHaveAccessibleName('Files')
	})
})

describe('TreeItem', () => {
	it('renders nested tree items when open', () => {
		renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Parent" defaultOpen>
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
		)

		expect(screen.getByText('Parent')).toBeInTheDocument()

		expect(screen.getByText('Child')).toBeInTheDocument()
	})

	it('renders prefix and suffix slots', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem
					label="Item"
					prefix={<span data-testid="pre">P</span>}
					suffix={<span data-testid="suf">S</span>}
				/>
			</Tree>,
		)

		expect(bySlot(container, 'tree-item-prefix')).toBeInTheDocument()

		expect(bySlot(container, 'tree-item-suffix')).toBeInTheDocument()

		expect(screen.getByTestId('pre')).toBeInTheDocument()

		expect(screen.getByTestId('suf')).toBeInTheDocument()
	})

	// The affixes are decorative, so a click on their content is a click on the row.
	it('toggles when clicking inside the prefix slot', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Parent" prefix={<span>pre</span>}>
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
		)

		const row = bySlot(container, 'tree-item-content')

		expect(row).toHaveAttribute('aria-expanded', 'false')

		fireEvent.click(screen.getByText('pre'))

		expect(row).toHaveAttribute('aria-expanded', 'true')
	})

	it('toggles when clicking the label', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Parent" prefix={<span>pre</span>}>
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
		)

		const row = bySlot(container, 'tree-item-content')

		fireEvent.click(screen.getByText('Parent'))

		expect(row).toHaveAttribute('aria-expanded', 'true')
	})

	// Each row presses one key on a parent row that starts open or closed and
	// reads where aria-expanded lands.
	it.each([
		['opens a closed parent on ArrowRight', false, 'ArrowRight', 'true'],
		['closes an open parent on ArrowLeft', true, 'ArrowLeft', 'false'],
		['toggles a closed parent on Enter', false, 'Enter', 'true'],
		['toggles a closed parent on Space', false, ' ', 'true'],
		['keeps an open branch open on ArrowRight', true, 'ArrowRight', 'true'],
		['keeps a closed branch closed on ArrowLeft', false, 'ArrowLeft', 'false'],
	])('%s', (_name, defaultOpen, key, expanded) => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Parent" defaultOpen={defaultOpen}>
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
		)

		const row = getSlot(container, 'tree-item-content')

		expect(row).toHaveAttribute('aria-expanded', String(defaultOpen))

		fireEvent.keyDown(row, { key })

		expect(row).toHaveAttribute('aria-expanded', expanded)
	})

	// The other two arrow cases move focus, as in the APG tree model.
	it('moves to the first child of an open branch, and to the parent', () => {
		renderUI(
			<Tree aria-label="Files">
				<TreeItem label="src" defaultOpen>
					<TreeItem label="lib">
						<TreeItem label="a.ts" />
					</TreeItem>
				</TreeItem>
			</Tree>,
		)

		const row = (name: string) => screen.getByRole('treeitem', { name })

		const key = (name: string) =>
			fireEvent.keyDown(present(document.activeElement, 'focused row'), { key: name })

		row('src').focus()

		// An open branch: ArrowRight moves to its first child.
		key('ArrowRight')

		expect(row('lib')).toHaveFocus()

		// A closed branch: ArrowRight opens it, and focus stays.
		key('ArrowRight')

		expect(row('lib')).toHaveAttribute('aria-expanded', 'true')

		expect(row('lib')).toHaveFocus()

		key('ArrowRight')

		expect(row('a.ts')).toHaveFocus()

		// A leaf: ArrowLeft moves to its parent.
		key('ArrowLeft')

		expect(row('lib')).toHaveFocus()

		// An open branch: ArrowLeft closes it, and focus stays.
		key('ArrowLeft')

		expect(row('lib')).toHaveAttribute('aria-expanded', 'false')

		expect(row('lib')).toHaveFocus()

		// A closed branch: ArrowLeft moves to its parent.
		key('ArrowLeft')

		expect(row('src')).toHaveFocus()

		// The root has no parent: ArrowLeft closes it, then does nothing.
		key('ArrowLeft')

		key('ArrowLeft')

		expect(row('src')).toHaveAttribute('aria-expanded', 'false')

		expect(row('src')).toHaveFocus()
	})

	it('ignores key events that bubble from descendants', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Parent">
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
		)

		const row = getSlot(container, 'tree-item-content')

		// Simulate a key event that originated from the inner span.
		const label = present(row.querySelector('span:last-of-type'), 'span:last-of-type')

		fireEvent.keyDown(label, { key: 'Enter' })

		expect(row).toHaveAttribute('aria-expanded', 'false')
	})

	it('moves the roving tabIndex onto the focused tree-item', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="One" />
				<TreeItem label="Two" />
				<TreeItem label="Three" />
			</Tree>,
		)

		const rows = container.querySelectorAll<HTMLElement>('[data-slot="tree-item-content"]')

		const first = rows[0] as HTMLElement

		const second = rows[1] as HTMLElement

		// The mount-time effect makes the first item tabbable.
		expect(first.tabIndex).toBe(0)

		expect(second.tabIndex).toBe(-1)

		// Focusing the second item moves the tabIndex through the roving focusin listener.
		fireEvent.focus(second)

		expect(second.tabIndex).toBe(0)

		expect(first.tabIndex).toBe(-1)
	})

	it('ignores focus events that bubble from outside any tree-item', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="One" />
			</Tree>,
		)

		const root = present(container.querySelector('[data-slot="tree"]'), '[data-slot="tree"]')

		const row = present(
			container.querySelector('[data-slot="tree-item-content"]'),
			'[data-slot="tree-item-content"]',
		)

		// Initial tabIndex from the mount-time roving effect.
		expect(row.tabIndex).toBe(0)

		// A focus event targeting the wrapper (no closest treeitem) must be a no-op.
		fireEvent.focus(root)

		expect(row.tabIndex).toBe(0)
	})

	it('pads each nested group by the indent step when the Tree opts in', () => {
		const { container } = renderUI(
			<Tree aria-label="Files" indent>
				<TreeItem label="Parent" defaultOpen>
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
		)

		const rows = container.querySelectorAll<HTMLElement>('[data-slot="tree-item-content"]')

		expect(rows.length).toBe(2)

		// The rows carry no inline indent: the nested group pads its start.
		for (const row of rows) expect(row.style.paddingLeft).toBe('')

		expect(getSlot(container, 'tree-group').className).toContain('density-ps-[6,7,8]')
	})

	it('pads no nested group when the Tree opts out of the indent', () => {
		const { container } = renderUI(
			<Tree aria-label="Files" indent={false}>
				<TreeItem label="Parent" defaultOpen>
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
		)

		expect(getSlot(container, 'tree-group').className).not.toContain('density-ps-')
	})

	it('marks a current TreeItem with aria-current', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Selected" current />
			</Tree>,
		)

		const row = getSlot(container, 'tree-item-content')

		expect(row).toBeInTheDocument()

		expect(row).toHaveAttribute('aria-current', 'true')
	})

	it('omits aria-current on a non-current TreeItem', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Plain" />
			</Tree>,
		)

		expect(bySlot(container, 'tree-item-content')).not.toHaveAttribute('aria-current')
	})

	it('passes a custom className through to the row content', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Styled" className="my-row" />
			</Tree>,
		)

		const row = getSlot(container, 'tree-item-content')

		expect(row.className).toContain('my-row')
	})

	it('honors controlled open=true and ignores defaultOpen', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Parent" open defaultOpen={false}>
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
		)

		const row = getSlot(container, 'tree-item-content')

		expect(row).toHaveAttribute('aria-expanded', 'true')
	})

	it('fires onOpenChange when controlled, without changing the row state', () => {
		const onOpenChange = vi.fn()

		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Parent" open={false} onOpenChange={onOpenChange}>
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
		)

		const row = getSlot(container, 'tree-item-content')

		fireEvent.click(screen.getByText('Parent'))

		expect(onOpenChange).toHaveBeenCalledWith(true)

		// Controlled: open stays false until the parent flips the prop.
		expect(row).toHaveAttribute('aria-expanded', 'false')
	})
})

describe('TreeItem group ownership', () => {
	// The child group is a sibling of the row in the DOM. The open row owns it,
	// and the label alone names the row.
	it('owns the group of an open branch, and takes its name from the label alone', async () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="src" defaultOpen suffix={<span>3 files</span>}>
					<TreeItem label="a.ts" />
				</TreeItem>
			</Tree>,
		)

		const row = screen.getByRole('treeitem', { name: 'src' })

		const group = present(document.getElementById(row.getAttribute('aria-owns') ?? ''), 'group')

		expect(group).toHaveAttribute('role', 'group')

		expect(group).toBe(getSlot(container, 'tree-group'))

		expect(group).toContainElement(screen.getByRole('treeitem', { name: 'a.ts' }))

		const results = await axe(container)

		expect(results.violations).toEqual([])
	})

	it('drops the ownership while the branch is closed, so the reference never dangles', () => {
		renderUI(
			<Tree aria-label="Files">
				<TreeItem label="src">
					<TreeItem label="a.ts" />
				</TreeItem>
				<TreeItem label="README" />
			</Tree>,
		)

		const row = screen.getByRole('treeitem', { name: 'src' })

		expect(row).not.toHaveAttribute('aria-owns')

		fireEvent.click(row)

		expect(document.getElementById(row.getAttribute('aria-owns') ?? '')).toHaveAttribute(
			'role',
			'group',
		)

		expect(screen.getByRole('treeitem', { name: 'README' })).not.toHaveAttribute('aria-owns')
	})
})

describe('TreeItem onAction', () => {
	const row = (container: HTMLElement, index = 0) =>
		(container.querySelectorAll('[role="treeitem"]')[index] as HTMLElement) ?? null

	it('reports a leaf activation by click and by Enter', () => {
		const onAction = vi.fn()

		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="a.ts" onAction={onAction} />
			</Tree>,
		)

		fireEvent.click(row(container))

		expect(onAction).toHaveBeenCalledOnce()

		fireEvent.keyDown(row(container), { key: 'Enter' })

		expect(onAction).toHaveBeenCalledTimes(2)

		fireEvent.keyDown(row(container), { key: ' ' })

		expect(onAction).toHaveBeenCalledTimes(3)
	})

	// A branch activation toggles, and onOpenChange reports that; the activation
	// itself is a separate fact, so both fire.
	it('reports a branch activation beside its toggle', () => {
		const onAction = vi.fn()

		const onOpenChange = vi.fn()

		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="src" onAction={onAction} onOpenChange={onOpenChange}>
					<TreeItem label="a.ts" />
				</TreeItem>
			</Tree>,
		)

		fireEvent.click(row(container))

		expect(onAction).toHaveBeenCalledOnce()

		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true)
	})

	// The box and Space toggle the check; the row was never activated.
	it('says nothing for a click on the check box or for Space on a checkable row', () => {
		const onAction = vi.fn()

		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="a.ts" defaultChecked={false} onAction={onAction} />
			</Tree>,
		)

		fireEvent.click(getSlot(container, 'tree-item-check'))

		fireEvent.keyDown(row(container), { key: ' ' })

		expect(onAction).not.toHaveBeenCalled()

		// The row itself still reports.
		fireEvent.click(row(container))

		expect(onAction).toHaveBeenCalledOnce()
	})

	// The arrows move the expansion, not the row.
	it('says nothing for ArrowRight or ArrowLeft', () => {
		const onAction = vi.fn()

		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="src" onAction={onAction}>
					<TreeItem label="a.ts" />
				</TreeItem>
			</Tree>,
		)

		fireEvent.keyDown(row(container), { key: 'ArrowRight' })

		fireEvent.keyDown(row(container), { key: 'ArrowLeft' })

		expect(onAction).not.toHaveBeenCalled()
	})
})

describe('TreeItem checked', () => {
	const row = (container: HTMLElement, index = 0) =>
		(container.querySelectorAll('[role="treeitem"]')[index] as HTMLElement) ?? null

	it('puts the state on the treeitem and draws a box hidden from AT', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="src" checked="mixed" onCheckedChange={() => {}} defaultOpen>
					<TreeItem label="a.ts" checked onCheckedChange={() => {}} />
					<TreeItem label="b.ts" checked={false} onCheckedChange={() => {}} />
				</TreeItem>
				<TreeItem label="README.md" />
			</Tree>,
		)

		expect(row(container, 0)).toHaveAttribute('aria-checked', 'mixed')

		expect(row(container, 3)).not.toHaveAttribute('aria-checked')

		const box = getSlot(row(container, 0), 'tree-item-check')

		expect(box).toHaveAttribute('aria-hidden', 'true')

		// No control sits inside a row, so the tree keeps one Tab stop.
		expect(container.querySelector('[role="treeitem"] :is(input, button, [tabindex])')).toBeNull()

		expect(row(container, 3).querySelector('[data-slot="tree-item-check"]')).toBeNull()
	})

	it('toggles an uncontrolled check by Space, by a box click, and by a leaf activation', () => {
		const onCheckedChange = vi.fn()

		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="a.ts" defaultChecked={false} onCheckedChange={onCheckedChange} />
			</Tree>,
		)

		fireEvent.keyDown(row(container), { key: ' ' })

		expect(row(container)).toHaveAttribute('aria-checked', 'true')

		fireEvent.click(getSlot(container, 'tree-item-check'))

		expect(row(container)).toHaveAttribute('aria-checked', 'false')

		fireEvent.click(screen.getByText('a.ts'))

		expect(row(container)).toHaveAttribute('aria-checked', 'true')

		fireEvent.keyDown(row(container), { key: 'Enter' })

		expect(row(container)).toHaveAttribute('aria-checked', 'false')

		expect(onCheckedChange.mock.calls).toEqual([[true], [false], [true], [false]])
	})

	it('reports a mixed row as checked on toggle, without changing a controlled row', () => {
		const onCheckedChange = vi.fn()

		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="src" checked="mixed" onCheckedChange={onCheckedChange}>
					<TreeItem label="a.ts" />
				</TreeItem>
			</Tree>,
		)

		fireEvent.keyDown(row(container), { key: ' ' })

		expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true)

		expect(row(container)).toHaveAttribute('aria-checked', 'mixed')
	})

	// A branch row keeps Enter and a label click for its expansion.
	it('toggles a checkable branch open on Enter and checks it on Space', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="src" defaultChecked={false}>
					<TreeItem label="a.ts" />
				</TreeItem>
			</Tree>,
		)

		fireEvent.keyDown(row(container), { key: 'Enter' })

		expect(row(container)).toHaveAttribute('aria-expanded', 'true')

		expect(row(container)).toHaveAttribute('aria-checked', 'false')

		fireEvent.keyDown(row(container), { key: ' ' })

		expect(row(container)).toHaveAttribute('aria-expanded', 'true')

		expect(row(container)).toHaveAttribute('aria-checked', 'true')
	})

	it('has no axe violations', async () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="src" defaultChecked="mixed" defaultOpen>
					<TreeItem label="a.ts" defaultChecked />
					<TreeItem label="b.ts" defaultChecked={false} />
				</TreeItem>
			</Tree>,
		)

		expect((await axe(container)).violations).toEqual([])
	})
})

describe('TreeSkeleton', () => {
	// Each row holds its depth spacers, the chevron column, and two placeholders.
	const spacers = (row: Element) => row.querySelectorAll(':scope > span').length - 1

	it('hides its rows from assistive technology and nests them in a fixed pattern', () => {
		const { container } = renderUI(<TreeSkeleton rows={5} />)

		const root = present(container.firstElementChild, 'skeleton')

		expect(root).toHaveAttribute('aria-hidden', 'true')

		expect(Array.from(root.children, spacers)).toStrictEqual([0, 1, 2, 1, 0])
	})

	it('draws no indent when the tree does not indent', () => {
		const { container } = renderUI(<TreeSkeleton rows={5} indent={false} />)

		const root = present(container.firstElementChild, 'skeleton')

		expect(Array.from(root.children, spacers)).toStrictEqual([0, 0, 0, 0, 0])
	})
})
