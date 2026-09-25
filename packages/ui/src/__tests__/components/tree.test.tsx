import { fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Tree, TreeItem } from '../../components/tree'
import { bySlot, getSlot, present, renderUI, screen } from '../helpers'

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
	it('renders the label', () => {
		renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Documents" />
			</Tree>,
		)

		expect(screen.getByText('Documents')).toBeInTheDocument()
	})

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

	it('does not toggle when clicking inside the prefix slot', () => {
		const onPrefixClick = vi.fn()

		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem
					label="Parent"
					prefix={
						<button type="button" data-testid="pre-btn" onClick={onPrefixClick}>
							pre
						</button>
					}
				>
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
		)

		const row = bySlot(container, 'tree-item-content')

		expect(row).toHaveAttribute('aria-expanded', 'false')

		fireEvent.click(screen.getByTestId('pre-btn'))

		expect(onPrefixClick).toHaveBeenCalledOnce()

		expect(row).toHaveAttribute('aria-expanded', 'false')
	})

	it('toggles when clicking outside the prefix slot', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Parent" prefix={<span>pre</span>}>
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
		)

		const row = bySlot(container, 'tree-item-content')

		expect(row).toHaveAttribute('aria-expanded', 'false')

		fireEvent.click(screen.getByText('Parent'))

		expect(row).toHaveAttribute('aria-expanded', 'true')
	})

	it('forwards leaf-row clicks to a clickable control in the prefix slot', () => {
		const onPrefixClick = vi.fn()

		renderUI(
			<Tree aria-label="Files">
				<TreeItem
					label="Leaf"
					prefix={
						<button type="button" data-testid="pre-btn" onClick={onPrefixClick}>
							pre
						</button>
					}
				/>
			</Tree>,
		)

		fireEvent.click(screen.getByText('Leaf'))

		expect(onPrefixClick).toHaveBeenCalledOnce()
	})

	it('opens a closed parent when ArrowRight is pressed on the row', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Parent">
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
		)

		const row = getSlot(container, 'tree-item-content')

		expect(row).toHaveAttribute('aria-expanded', 'false')

		fireEvent.keyDown(row, { key: 'ArrowRight' })

		expect(row).toHaveAttribute('aria-expanded', 'true')
	})

	it('closes an open parent when ArrowLeft is pressed on the row', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Parent" defaultOpen>
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
		)

		const row = getSlot(container, 'tree-item-content')

		expect(row).toHaveAttribute('aria-expanded', 'true')

		fireEvent.keyDown(row, { key: 'ArrowLeft' })

		expect(row).toHaveAttribute('aria-expanded', 'false')
	})

	it('toggles a parent on Enter', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Parent">
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
		)

		const row = getSlot(container, 'tree-item-content')

		fireEvent.keyDown(row, { key: 'Enter' })

		expect(row).toHaveAttribute('aria-expanded', 'true')
	})

	it('toggles a parent on Space', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Parent">
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
		)

		const row = getSlot(container, 'tree-item-content')

		fireEvent.keyDown(row, { key: ' ' })

		expect(row).toHaveAttribute('aria-expanded', 'true')
	})

	it('Enter on a leaf forwards the click to a prefix-interactive control', () => {
		const onPrefixClick = vi.fn()

		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem
					label="Leaf"
					prefix={
						<button type="button" data-testid="pre-btn" onClick={onPrefixClick}>
							pre
						</button>
					}
				/>
			</Tree>,
		)

		const row = getSlot(container, 'tree-item-content')

		fireEvent.keyDown(row, { key: 'Enter' })

		expect(onPrefixClick).toHaveBeenCalledOnce()
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

	it('ArrowRight on an already-open branch does not collapse it', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Parent" defaultOpen>
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
		)

		const row = getSlot(container, 'tree-item-content')

		fireEvent.keyDown(row, { key: 'ArrowRight' })

		expect(row).toHaveAttribute('aria-expanded', 'true')
	})

	it('ArrowLeft on an already-closed branch does not open it', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Parent">
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
		)

		const row = getSlot(container, 'tree-item-content')

		fireEvent.keyDown(row, { key: 'ArrowLeft' })

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

		// Focusing the second item moves the tabIndex via the Tree's focus capture.
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

	it('applies indent padding to nested items when the Tree opts in', () => {
		const { container } = renderUI(
			<Tree aria-label="Files" indent>
				<TreeItem label="Parent" defaultOpen>
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
		)

		const rows = container.querySelectorAll<HTMLElement>('[data-slot="tree-item-content"]')

		expect(rows.length).toBe(2)

		const parent = rows[0] as HTMLElement

		const child = rows[1] as HTMLElement

		// depth-0 stays at the base inset: 0.5 + 0 * indentStep.md.
		expect(parent.style.paddingLeft).toBe('0.5rem')

		// depth-1 md item indents by one step: 0.5 + 1 * 1.75 = 2.25rem.
		expect(child.style.paddingLeft).toBe('2.25rem')
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

	// The affix slots own their own clicks; the row was never activated.
	it('says nothing for a click inside prefix or suffix', () => {
		const onAction = vi.fn()

		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem
					label="a.ts"
					onAction={onAction}
					prefix={<input type="checkbox" aria-label="Pick a.ts" />}
					suffix={<button type="button">More</button>}
				/>
			</Tree>,
		)

		fireEvent.click(screen.getByRole('checkbox', { name: 'Pick a.ts' }))

		fireEvent.click(screen.getByRole('button', { name: 'More' }))

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
