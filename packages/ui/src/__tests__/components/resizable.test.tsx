import { describe, expect, it } from 'vitest'
import { ResizableGroup, ResizableHandle, ResizablePanel } from '../../components/resizable'
import { allBySlot, bySlot, renderUI } from '../helpers'

describe('Resizable', () => {
	it('renders with data-slot="resizable-group"', () => {
		const { container } = renderUI(
			<ResizableGroup>
				<ResizablePanel>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel>B</ResizablePanel>
			</ResizableGroup>,
		)

		expect(bySlot(container, 'resizable-group')).toBeInTheDocument()
	})

	it('renders panels with data-slot="resizable-panel"', () => {
		const { container } = renderUI(
			<ResizableGroup>
				<ResizablePanel>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel>B</ResizablePanel>
			</ResizableGroup>,
		)

		expect(allBySlot(container, 'resizable-panel')).toHaveLength(2)
	})

	it('renders handle with data-slot="resizable-handle"', () => {
		const { container } = renderUI(
			<ResizableGroup>
				<ResizablePanel>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel>B</ResizablePanel>
			</ResizableGroup>,
		)

		expect(bySlot(container, 'resizable-handle')).toBeInTheDocument()
	})

	it('handle has role="separator"', () => {
		const { container } = renderUI(
			<ResizableGroup>
				<ResizablePanel>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel>B</ResizablePanel>
			</ResizableGroup>,
		)

		expect(bySlot(container, 'resizable-handle')).toHaveAttribute('role', 'separator')
	})

	it('handle is focusable', () => {
		const { container } = renderUI(
			<ResizableGroup>
				<ResizablePanel>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel>B</ResizablePanel>
			</ResizableGroup>,
		)

		expect(bySlot(container, 'resizable-handle')).toHaveAttribute('tabindex', '0')
	})

	it('applies custom className to group', () => {
		const { container } = renderUI(
			<ResizableGroup className="custom">
				<ResizablePanel>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel>B</ResizablePanel>
			</ResizableGroup>,
		)

		expect(bySlot(container, 'resizable-group')?.className).toContain('custom')
	})

	it('applies custom className to panel', () => {
		const { container } = renderUI(
			<ResizableGroup>
				<ResizablePanel className="custom">A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel>B</ResizablePanel>
			</ResizableGroup>,
		)

		expect(allBySlot(container, 'resizable-panel')[0]?.className).toContain('custom')
	})

	it('applies custom className to handle', () => {
		const { container } = renderUI(
			<ResizableGroup>
				<ResizablePanel>A</ResizablePanel>
				<ResizableHandle className="custom" />
				<ResizablePanel>B</ResizablePanel>
			</ResizableGroup>,
		)

		expect(bySlot(container, 'resizable-handle')?.className).toContain('custom')
	})

	it('sets direction data attribute', () => {
		const { container } = renderUI(
			<ResizableGroup direction="vertical">
				<ResizablePanel>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel>B</ResizablePanel>
			</ResizableGroup>,
		)

		expect(bySlot(container, 'resizable-group')).toHaveAttribute('data-direction', 'vertical')
	})

	it('panels have flex style based on default sizes', () => {
		const { container } = renderUI(
			<ResizableGroup>
				<ResizablePanel defaultSize={70}>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={30}>B</ResizablePanel>
			</ResizableGroup>,
		)

		const panels = allBySlot(container, 'resizable-panel')

		expect(panels[0]?.style.flex).toBe('70 0 0px')
		expect(panels[1]?.style.flex).toBe('30 0 0px')
	})

	it('renders children content', () => {
		const { container } = renderUI(
			<ResizableGroup>
				<ResizablePanel>Left content</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel>Right content</ResizablePanel>
			</ResizableGroup>,
		)

		expect(container.textContent).toContain('Left content')
		expect(container.textContent).toContain('Right content')
	})

	it('handle has aria-label="Resize"', () => {
		const { container } = renderUI(
			<ResizableGroup>
				<ResizablePanel>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel>B</ResizablePanel>
			</ResizableGroup>,
		)

		expect(bySlot(container, 'resizable-handle')).toHaveAttribute('aria-label', 'Resize')
	})

	it('handle has aria-valuenow reflecting panel size', () => {
		const { container } = renderUI(
			<ResizableGroup>
				<ResizablePanel defaultSize={70}>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={30}>B</ResizablePanel>
			</ResizableGroup>,
		)

		expect(bySlot(container, 'resizable-handle')).toHaveAttribute('aria-valuenow', '70')
	})

	it('handle has aria-valuemin and aria-valuemax', () => {
		const { container } = renderUI(
			<ResizableGroup>
				<ResizablePanel defaultSize={50} minSize={20} maxSize={80}>
					A
				</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={50}>B</ResizablePanel>
			</ResizableGroup>,
		)

		const handle = bySlot(container, 'resizable-handle')

		expect(handle).toHaveAttribute('aria-valuemin', '20')
		expect(handle).toHaveAttribute('aria-valuemax', '80')
	})
})
