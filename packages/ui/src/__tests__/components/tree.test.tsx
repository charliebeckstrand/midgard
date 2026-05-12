import { fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Tree, TreeItem } from '../../components/tree'
import { bySlot, renderUI, screen } from '../helpers'

describe('Tree', () => {
	it('renders with data-slot="tree" and role="tree"', () => {
		const { container } = renderUI(
			<Tree>
				<TreeItem label="Item 1" />
			</Tree>,
		)

		const el = bySlot(container, 'tree')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('role', 'tree')
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Tree className="custom">
				<TreeItem label="Item 1" />
			</Tree>,
		)

		const el = bySlot(container, 'tree')

		expect(el?.className).toContain('custom')
	})
})

describe('TreeItem', () => {
	it('renders with data-slot="tree-item"', () => {
		const { container } = renderUI(
			<Tree>
				<TreeItem label="Item 1" />
			</Tree>,
		)

		expect(bySlot(container, 'tree-item')).toBeInTheDocument()
	})

	it('renders the label', () => {
		renderUI(
			<Tree>
				<TreeItem label="Documents" />
			</Tree>,
		)

		expect(screen.getByText('Documents')).toBeInTheDocument()
	})

	it('renders nested tree items when open', () => {
		renderUI(
			<Tree>
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
			<Tree>
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
			<Tree>
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
			<Tree>
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
			<Tree>
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

	it('size prop applies size classes to items', () => {
		const { container } = renderUI(
			<Tree size="lg">
				<TreeItem label="Item" />
			</Tree>,
		)

		const row = bySlot(container, 'tree-item-content')

		expect(row?.className).toContain('text-lg')
	})

	it('default size applies the md (text-base) class', () => {
		const { container } = renderUI(
			<Tree>
				<TreeItem label="Item" />
			</Tree>,
		)

		const row = bySlot(container, 'tree-item-content')

		expect(row?.className).toContain('text-base')
	})

	it('size="sm" applies text-sm', () => {
		const { container } = renderUI(
			<Tree size="sm">
				<TreeItem label="Item" />
			</Tree>,
		)

		const row = bySlot(container, 'tree-item-content')

		expect(row?.className).toContain('text-sm')
	})
})
