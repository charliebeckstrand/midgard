import { describe, expect, it, vi } from 'vitest'
import { ResizableGroup, ResizableHandle, ResizablePanel } from '../../components/resizable'
import { allBySlot, bySlot, fireEvent, getSlot, renderUI } from '../helpers'

describe('Resizable', () => {
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

	it('names the panel before each handle in aria-controls', () => {
		const { container } = renderUI(
			<ResizableGroup>
				<ResizablePanel>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel>B</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel>C</ResizablePanel>
			</ResizableGroup>,
		)

		const panels = allBySlot(container, 'resizable-panel')

		const handles = allBySlot(container, 'resizable-handle')

		expect(new Set(panels.map((panel) => panel.id)).size).toBe(3)

		// The primary pane of each splitter is the panel before it, whose size the value gives.
		expect(handles.map((handle) => handle.getAttribute('aria-controls'))).toEqual([
			panels[0]?.id,
			panels[1]?.id,
		])
	})

	it('reports the separator orientation perpendicular to the group axis', () => {
		const { container } = renderUI(
			<ResizableGroup orientation="horizontal">
				<ResizablePanel>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel>B</ResizablePanel>
			</ResizableGroup>,
		)

		// Side-by-side panels are separated by a vertical bar; a separator's
		// orientation is its own, not the group's flex axis.
		expect(bySlot(container, 'resizable-handle')).toHaveAttribute('aria-orientation', 'vertical')
	})

	it('accepts a custom handle label and defaults to Resize', () => {
		const { container, rerender } = renderUI(
			<ResizableGroup>
				<ResizablePanel>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel>B</ResizablePanel>
			</ResizableGroup>,
		)

		expect(bySlot(container, 'resizable-handle')).toHaveAttribute('aria-label', 'Resize')

		rerender(
			<ResizableGroup>
				<ResizablePanel>A</ResizablePanel>
				<ResizableHandle aria-label="Resize sidebar" />
				<ResizablePanel>B</ResizablePanel>
			</ResizableGroup>,
		)

		expect(bySlot(container, 'resizable-handle')).toHaveAttribute('aria-label', 'Resize sidebar')
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

	it('sets orientation data attribute', () => {
		const { container } = renderUI(
			<ResizableGroup orientation="vertical">
				<ResizablePanel>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel>B</ResizablePanel>
			</ResizableGroup>,
		)

		expect(bySlot(container, 'resizable-group')).toHaveAttribute('data-orientation', 'vertical')
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

describe('Resizable: handle range', () => {
	// The range is where the left panel can go while both panels keep their bounds
	// (B08-C07). Before, it was the left panel's own bounds, so a constrained
	// neighbor made the reported ends unreachable.
	it('takes the maximum from the right minSize', () => {
		const { container } = renderUI(
			<ResizableGroup>
				<ResizablePanel defaultSize={50}>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={50} minSize={20}>
					B
				</ResizablePanel>
			</ResizableGroup>,
		)

		const handle = bySlot(container, 'resizable-handle')

		expect(handle).toHaveAttribute('aria-valuemin', '0')

		expect(handle).toHaveAttribute('aria-valuemax', '80')
	})

	it('takes the minimum from the right maxSize', () => {
		const { container } = renderUI(
			<ResizableGroup>
				<ResizablePanel defaultSize={50}>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={50} maxSize={55}>
					B
				</ResizablePanel>
			</ResizableGroup>,
		)

		expect(bySlot(container, 'resizable-handle')).toHaveAttribute('aria-valuemin', '45')
	})

	it('reads the range of the pair, not of the group, with three panels', () => {
		const { container } = renderUI(
			<ResizableGroup>
				<ResizablePanel defaultSize={1}>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={1}>B</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={2}>C</ResizablePanel>
			</ResizableGroup>,
		)

		const [first] = allBySlot(container, 'resizable-handle')

		// The pair A + B holds 50 of the 100, so A reaches 50 at most.
		expect(first).toHaveAttribute('aria-valuemax', '50')
	})
})

describe('Resizable: keyboard', () => {
	// Each row presses one key on the handle between two 50% panels and reads the
	// last sizes reported.
	it.each<
		[
			string,
			{ orientation?: 'horizontal' | 'vertical'; minSize?: number; maxSize?: number },
			{ key: string; shiftKey?: boolean },
			number[],
		]
	>([
		[
			'ArrowRight grows the left panel by 5% in a horizontal group',
			{},
			{ key: 'ArrowRight' },
			[55, 45],
		],
		[
			'ArrowLeft shrinks the left panel by 5% in a horizontal group',
			{},
			{ key: 'ArrowLeft' },
			[45, 55],
		],
		['Shift + arrow uses a 10% step', {}, { key: 'ArrowRight', shiftKey: true }, [60, 40]],
		['Home collapses the left panel to its minimum', { minSize: 10 }, { key: 'Home' }, [10, 90]],
		['End grows the left panel to its maximum', { maxSize: 90 }, { key: 'End' }, [90, 10]],
		[
			'ArrowDown grows the top panel in a vertical group',
			{ orientation: 'vertical' },
			{ key: 'ArrowDown' },
			[55, 45],
		],
	])('%s', (_name, { orientation, minSize, maxSize }, key, expected) => {
		const onSizesChange = vi.fn()

		const { container } = renderUI(
			<ResizableGroup orientation={orientation} onSizesChange={onSizesChange}>
				<ResizablePanel defaultSize={50} minSize={minSize} maxSize={maxSize}>
					A
				</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={50}>B</ResizablePanel>
			</ResizableGroup>,
		)

		fireEvent.keyDown(getSlot(container, 'resizable-handle'), key)

		expect(onSizesChange.mock.calls.at(-1)?.[0]).toEqual(expected)
	})

	it('ignores arrow keys that do not match the orientation', () => {
		const onSizesChange = vi.fn()

		const { container } = renderUI(
			<ResizableGroup onSizesChange={onSizesChange}>
				<ResizablePanel defaultSize={50}>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={50}>B</ResizablePanel>
			</ResizableGroup>,
		)

		const handle = getSlot(container, 'resizable-handle')

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

		const group = getSlot(container, 'resizable-group')

		group.getBoundingClientRect = () => DOMRect.fromRect({ width: 200, height: 20 })

		const handle = getSlot(container, 'resizable-handle')

		fireEvent.pointerDown(handle, { isPrimary: true, button: 0, clientX: 100, clientY: 0 })

		expect(handle).toHaveAttribute('data-dragging')

		fireEvent.pointerUp(document)

		expect(handle).not.toHaveAttribute('data-dragging')
	})

	it.each([
		['a secondary mouse button', { isPrimary: true, button: 2 }],
		['a macOS Ctrl-click', { isPrimary: true, button: 0, ctrlKey: true }],
		['a pointer that is not primary', { isPrimary: false, button: 0 }],
	])('ignores %s', (_name, init) => {
		const onSizesChange = vi.fn()

		const { container } = renderUI(
			<ResizableGroup onSizesChange={onSizesChange}>
				<ResizablePanel defaultSize={50}>A</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={50}>B</ResizablePanel>
			</ResizableGroup>,
		)

		// The box the case above gives the group. With no box, every press fails
		// the size guard, and the button filter decides nothing.
		const group = getSlot(container, 'resizable-group')

		group.getBoundingClientRect = () => DOMRect.fromRect({ width: 200, height: 20 })

		const handle = getSlot(container, 'resizable-handle')

		fireEvent.pointerDown(handle, { clientX: 100, clientY: 0, ...init })

		expect(handle).not.toHaveAttribute('data-dragging')

		expect(onSizesChange).not.toHaveBeenCalled()
	})
})
