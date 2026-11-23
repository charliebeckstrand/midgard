import { describe, expect, it, vi } from 'vitest'
import { ResizableGroup, ResizableHandle, ResizablePanel } from '../../components/resizable'
import { fireEvent, renderUI } from '../helpers'

/**
 * A pointer drag on a group handle subtracts the widths of the handles of that
 * group from the draggable size. Before, it also subtracted the handles of a
 * group nested in a panel. A nested vertical group in a horizontal group then
 * gave a handle as wide as its panel, so the outer handle moved about twice as
 * far as the pointer.
 *
 * Rides the real browser because the sizes come from layout, which jsdom does
 * not have.
 */
describe('Resizable nested group drag (real browser)', () => {
	it('moves the outer handle with the pointer when a panel holds a cross-axis group', () => {
		const onSizesChange = vi.fn()

		const { container } = renderUI(
			<div style={{ width: 400, height: 200 }}>
				<ResizableGroup onSizesChange={onSizesChange}>
					<ResizablePanel defaultSize={50}>
						<ResizableGroup orientation="vertical">
							<ResizablePanel defaultSize={50}>A</ResizablePanel>
							<ResizableHandle />
							<ResizablePanel defaultSize={50}>B</ResizablePanel>
						</ResizableGroup>
					</ResizablePanel>
					<ResizableHandle />
					<ResizablePanel defaultSize={50}>C</ResizablePanel>
				</ResizableGroup>
			</div>,
		)

		const outerGroup = container.querySelector<HTMLElement>('[data-slot="resizable-group"]')

		const handle = outerGroup?.querySelector<HTMLElement>(':scope > [data-slot="resizable-handle"]')

		if (!outerGroup || !handle) throw new Error('The outer group or its handle did not render')

		const box = handle.getBoundingClientRect()

		const available = outerGroup.getBoundingClientRect().width - box.width

		const x = box.left + box.width / 2

		const travel = 40

		fireEvent.pointerDown(handle, {
			isPrimary: true,
			button: 0,
			pointerId: 1,
			clientX: x,
			clientY: 100,
		})

		fireEvent.pointerMove(document, { pointerId: 1, clientX: x + travel, clientY: 100 })

		fireEvent.pointerUp(document, { pointerId: 1 })

		const sizes = onSizesChange.mock.calls.at(-1)?.[0] as number[] | undefined

		expect(sizes?.[0]).toBeCloseTo(50 + (travel / available) * 100, 0)
	})
})
