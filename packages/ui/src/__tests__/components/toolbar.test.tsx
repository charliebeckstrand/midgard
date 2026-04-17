import { describe, expect, it } from 'vitest'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../../components/toolbar'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('Toolbar', () => {
	it('renders with data-slot="toolbar"', () => {
		const { container } = renderUI(<Toolbar>content</Toolbar>)

		const el = bySlot(container, 'toolbar')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Toolbar className="custom">content</Toolbar>)

		expect(bySlot(container, 'toolbar')?.className).toContain('custom')
	})

	it('renders children', () => {
		renderUI(
			<Toolbar>
				<button type="button">Action</button>
			</Toolbar>,
		)

		expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
	})

	it('has role="toolbar"', () => {
		const { container } = renderUI(<Toolbar>content</Toolbar>)

		expect(bySlot(container, 'toolbar')).toHaveAttribute('role', 'toolbar')
	})

	it('defaults to horizontal aria-orientation', () => {
		const { container } = renderUI(<Toolbar>content</Toolbar>)

		expect(bySlot(container, 'toolbar')).toHaveAttribute('aria-orientation', 'horizontal')
	})

	it('reflects the orientation prop on aria-orientation', () => {
		const { container } = renderUI(<Toolbar orientation="vertical">content</Toolbar>)

		expect(bySlot(container, 'toolbar')).toHaveAttribute('aria-orientation', 'vertical')
	})

	it('passes aria-label through', () => {
		const { container } = renderUI(<Toolbar aria-label="Formatting">content</Toolbar>)

		expect(bySlot(container, 'toolbar')).toHaveAttribute('aria-label', 'Formatting')
	})

	it('moves focus to the next item on ArrowRight', () => {
		const { container } = renderUI(
			<Toolbar>
				<button type="button">A</button>
				<button type="button">B</button>
			</Toolbar>,
		)

		const [first, second] = Array.from(container.querySelectorAll('button'))

		first?.focus()

		expect(document.activeElement).toBe(first)

		fireEvent.keyDown(bySlot(container, 'toolbar') as HTMLElement, { key: 'ArrowRight' })

		expect(document.activeElement).toBe(second)
	})

	it('skips disabled items during keyboard navigation', () => {
		const { container } = renderUI(
			<Toolbar>
				<button type="button">A</button>
				<button type="button" disabled>
					B
				</button>
				<button type="button">C</button>
			</Toolbar>,
		)

		const buttons = Array.from(container.querySelectorAll('button'))

		buttons[0]?.focus()

		fireEvent.keyDown(bySlot(container, 'toolbar') as HTMLElement, { key: 'ArrowRight' })

		expect(document.activeElement).toBe(buttons[2])
	})
})

describe('ToolbarGroup', () => {
	it('renders with data-slot="toolbar-group"', () => {
		const { container } = renderUI(
			<Toolbar>
				<ToolbarGroup>
					<button type="button">A</button>
				</ToolbarGroup>
			</Toolbar>,
		)

		expect(bySlot(container, 'toolbar-group')).toBeInTheDocument()
	})

	it('has role="group"', () => {
		const { container } = renderUI(
			<Toolbar>
				<ToolbarGroup aria-label="Marks">
					<button type="button">A</button>
				</ToolbarGroup>
			</Toolbar>,
		)

		const el = bySlot(container, 'toolbar-group')

		expect(el).toHaveAttribute('role', 'group')

		expect(el).toHaveAttribute('aria-label', 'Marks')
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Toolbar>
				<ToolbarGroup className="custom">
					<button type="button">A</button>
				</ToolbarGroup>
			</Toolbar>,
		)

		expect(bySlot(container, 'toolbar-group')?.className).toContain('custom')
	})
})

describe('ToolbarSeparator', () => {
	it('renders with data-slot="toolbar-separator"', () => {
		const { container } = renderUI(
			<Toolbar>
				<button type="button">A</button>
				<ToolbarSeparator />
				<button type="button">B</button>
			</Toolbar>,
		)

		expect(bySlot(container, 'toolbar-separator')).toBeInTheDocument()
	})

	it('has role="separator" with aria-orientation opposite the toolbar', () => {
		const { container } = renderUI(
			<Toolbar orientation="horizontal">
				<button type="button">A</button>
				<ToolbarSeparator />
			</Toolbar>,
		)

		const el = bySlot(container, 'toolbar-separator')

		expect(el).toHaveAttribute('role', 'separator')

		expect(el).toHaveAttribute('aria-orientation', 'vertical')
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Toolbar>
				<ToolbarSeparator className="custom" />
			</Toolbar>,
		)

		expect(bySlot(container, 'toolbar-separator')?.className).toContain('custom')
	})
})
