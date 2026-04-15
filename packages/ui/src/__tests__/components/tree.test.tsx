import { describe, expect, it } from 'vitest'
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
})
