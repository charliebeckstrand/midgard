import { fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Tree, TreeItem } from '../../components/tree'
import { bySlot, renderUI, screen } from '../helpers'

describe('Tree', () => {
	it('renders with data-slot="tree" and role="tree"', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Item 1" />
			</Tree>,
		)

		const el = bySlot(container, 'tree')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('role', 'tree')
	})

	it('forwards the required accessible name onto the tree', () => {
		renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Item 1" />
			</Tree>,
		)

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

		const row = bySlot(container, 'tree-item-content') as HTMLElement

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

		const row = bySlot(container, 'tree-item-content') as HTMLElement

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

		const row = bySlot(container, 'tree-item-content') as HTMLElement

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

		const row = bySlot(container, 'tree-item-content') as HTMLElement

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

		const row = bySlot(container, 'tree-item-content') as HTMLElement

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

		const row = bySlot(container, 'tree-item-content') as HTMLElement

		// Simulate a key event that originated from the inner span.
		const label = row.querySelector('span:last-of-type') as HTMLElement

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

		const row = bySlot(container, 'tree-item-content') as HTMLElement

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

		const row = bySlot(container, 'tree-item-content') as HTMLElement

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

		const root = container.querySelector<HTMLElement>('[data-slot="tree"]') as HTMLElement

		const row = container.querySelector<HTMLElement>(
			'[data-slot="tree-item-content"]',
		) as HTMLElement

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

		const child = rows[1] as HTMLElement

		expect(child.style.paddingLeft).not.toBe('0.5rem')
	})

	it('marks a current TreeItem with aria-current', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Selected" current />
			</Tree>,
		)

		const row = bySlot(container, 'tree-item-content') as HTMLElement

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

		const row = bySlot(container, 'tree-item-content') as HTMLElement

		expect(row.className).toContain('my-row')
	})

	it('honours controlled open=true and ignores defaultOpen', () => {
		const { container } = renderUI(
			<Tree aria-label="Files">
				<TreeItem label="Parent" open defaultOpen={false}>
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
		)

		const row = bySlot(container, 'tree-item-content') as HTMLElement

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

		const row = bySlot(container, 'tree-item-content') as HTMLElement

		fireEvent.click(screen.getByText('Parent'))

		expect(onOpenChange).toHaveBeenCalledWith(true)

		// Controlled — open stays false until the parent flips the prop.
		expect(row).toHaveAttribute('aria-expanded', 'false')
	})
})
