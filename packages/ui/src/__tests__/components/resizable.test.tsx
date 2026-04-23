import { describe, expect, it, vi } from 'vitest'
import { ResizableGroup, ResizableHandle, ResizablePanel } from '../../components/resizable'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'

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

describe('Resizable: keyboard', () => {
	it('ArrowRight grows the left panel by 5% in a horizontal group', () => {
		const onSizesChange = vi.fn()

		const { container } = renderUI(
			<ResizableGroup onSizesChange={onSizesChange}>
				<ResizablePanel defaultSize={50}>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={50}>B</ResizablePanel>
			</ResizableGroup>,
		)

		const handle = bySlot(container, 'resizable-handle') as HTMLElement

		fireEvent.keyDown(handle, { key: 'ArrowRight' })

		expect(onSizesChange).toHaveBeenCalled()

		const [next] = onSizesChange.mock.calls.at(-1) ?? []

		expect(next).toEqual([55, 45])
	})

	it('ArrowLeft shrinks the left panel by 5% in a horizontal group', () => {
		const onSizesChange = vi.fn()

		const { container } = renderUI(
			<ResizableGroup onSizesChange={onSizesChange}>
				<ResizablePanel defaultSize={50}>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={50}>B</ResizablePanel>
			</ResizableGroup>,
		)

		const handle = bySlot(container, 'resizable-handle') as HTMLElement

		fireEvent.keyDown(handle, { key: 'ArrowLeft' })

		expect(onSizesChange.mock.calls.at(-1)?.[0]).toEqual([45, 55])
	})

	it('Shift + arrow uses a 10% step', () => {
		const onSizesChange = vi.fn()

		const { container } = renderUI(
			<ResizableGroup onSizesChange={onSizesChange}>
				<ResizablePanel defaultSize={50}>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={50}>B</ResizablePanel>
			</ResizableGroup>,
		)

		const handle = bySlot(container, 'resizable-handle') as HTMLElement

		fireEvent.keyDown(handle, { key: 'ArrowRight', shiftKey: true })

		expect(onSizesChange.mock.calls.at(-1)?.[0]).toEqual([60, 40])
	})

	it('Home collapses the left panel to its minimum', () => {
		const onSizesChange = vi.fn()

		const { container } = renderUI(
			<ResizableGroup onSizesChange={onSizesChange}>
				<ResizablePanel defaultSize={50} minSize={10}>
					A
				</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={50}>B</ResizablePanel>
			</ResizableGroup>,
		)

		const handle = bySlot(container, 'resizable-handle') as HTMLElement

		fireEvent.keyDown(handle, { key: 'Home' })

		expect(onSizesChange.mock.calls.at(-1)?.[0]).toEqual([10, 90])
	})

	it('End grows the left panel to its maximum', () => {
		const onSizesChange = vi.fn()

		const { container } = renderUI(
			<ResizableGroup onSizesChange={onSizesChange}>
				<ResizablePanel defaultSize={50} maxSize={90}>
					A
				</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={50}>B</ResizablePanel>
			</ResizableGroup>,
		)

		const handle = bySlot(container, 'resizable-handle') as HTMLElement

		fireEvent.keyDown(handle, { key: 'End' })

		expect(onSizesChange.mock.calls.at(-1)?.[0]).toEqual([90, 10])
	})

	it('ArrowDown grows the top panel in a vertical group', () => {
		const onSizesChange = vi.fn()

		const { container } = renderUI(
			<ResizableGroup direction="vertical" onSizesChange={onSizesChange}>
				<ResizablePanel defaultSize={50}>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={50}>B</ResizablePanel>
			</ResizableGroup>,
		)

		const handle = bySlot(container, 'resizable-handle') as HTMLElement

		fireEvent.keyDown(handle, { key: 'ArrowDown' })

		expect(onSizesChange.mock.calls.at(-1)?.[0]).toEqual([55, 45])
	})

	it('ignores arrow keys that do not match the direction', () => {
		const onSizesChange = vi.fn()

		const { container } = renderUI(
			<ResizableGroup onSizesChange={onSizesChange}>
				<ResizablePanel defaultSize={50}>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={50}>B</ResizablePanel>
			</ResizableGroup>,
		)

		const handle = bySlot(container, 'resizable-handle') as HTMLElement

		fireEvent.keyDown(handle, { key: 'ArrowUp' })

		expect(onSizesChange).not.toHaveBeenCalled()
	})
})

describe('Resizable: drag', () => {
	it('sets data-dragging on the handle during pointer drag', () => {
		const { container } = renderUI(
			<ResizableGroup>
				<ResizablePanel defaultSize={50}>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={50}>B</ResizablePanel>
			</ResizableGroup>,
		)

		const group = bySlot(container, 'resizable-group') as HTMLElement

		group.getBoundingClientRect = () =>
			({ x: 0, y: 0, left: 0, top: 0, right: 200, bottom: 20, width: 200, height: 20 }) as DOMRect

		const handle = bySlot(container, 'resizable-handle') as HTMLElement

		fireEvent.pointerDown(handle, { button: 0, clientX: 100, clientY: 0 })

		expect(handle).toHaveAttribute('data-dragging')

		fireEvent.pointerUp(document)

		expect(handle).not.toHaveAttribute('data-dragging')
	})

	it('ignores non-left mouse buttons', () => {
		const onSizesChange = vi.fn()

		const { container } = renderUI(
			<ResizableGroup onSizesChange={onSizesChange}>
				<ResizablePanel defaultSize={50}>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={50}>B</ResizablePanel>
			</ResizableGroup>,
		)

		const handle = bySlot(container, 'resizable-handle') as HTMLElement

		fireEvent.pointerDown(handle, { button: 2, clientX: 100, clientY: 0 })

		expect(handle).not.toHaveAttribute('data-dragging')

		expect(onSizesChange).not.toHaveBeenCalled()
	})
})
