import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardGrid, DashboardItem, type DashboardLayoutItem } from '../../modules/dashboard'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'

/** Gives every element a measured width, so the grid's pitch math engages. */
function mockMeasuredWidth(width: number) {
	Object.defineProperty(Element.prototype, 'clientWidth', {
		configurable: true,
		get: () => width,
	})
}

const WIDE: DashboardLayoutItem[] = [
	{ id: 'a', x: 0, y: 0, w: 12 },
	{ id: 'b', x: 12, y: 0, w: 12 },
]

/** A two-tile board, both ratio-locked, wide enough to sit side by side. */
function board(editing = false, layout?: Parameters<typeof DashboardGrid>[0]['layout']) {
	return (
		<DashboardGrid aria-label="Sales" editing={editing} layout={layout ?? { value: WIDE }}>
			<DashboardItem id="a" ratio={16 / 9}>
				<div data-testid="content-a" />
			</DashboardItem>

			<DashboardItem id="b" ratio={16 / 9}>
				<div data-testid="content-b" />
			</DashboardItem>
		</DashboardGrid>
	)
}

const originalClientWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')

beforeEach(() => {
	mockMeasuredWidth(960)
})

afterEach(() => {
	if (originalClientWidth) {
		Object.defineProperty(Element.prototype, 'clientWidth', originalClientWidth)
	}
})

describe('DashboardGrid', () => {
	it('positions tiles proportionally from the bound layout', () => {
		const { container } = renderUI(board())

		const [a, b] = allBySlot(container, 'dashboard-item')

		expect(a?.style.left).toBe('0%')

		expect(a?.style.width).toBe('50%')

		expect(b?.style.left).toBe('50%')

		// Both 12-wide at 16:9 derive 27 rows, the grid's whole height.
		expect(a?.style.height).toBe('100%')

		expect(b?.style.height).toBe('100%')
	})

	it('derives identical heights for equal ratios at equal spans', () => {
		const { container } = renderUI(board())

		const [a, b] = allBySlot(container, 'dashboard-item')

		expect(a?.style.height).toBe(b?.style.height)
	})

	it('auto-slots unbound items in mount order and stacks them', () => {
		const { container } = renderUI(
			<DashboardGrid aria-label="Sales">
				<DashboardItem id="first">
					<div />
				</DashboardItem>

				<DashboardItem id="second">
					<div />
				</DashboardItem>
			</DashboardGrid>,
		)

		const [first, second] = allBySlot(container, 'dashboard-item')

		expect(first?.style.top).toBe('0%')

		expect(second?.style.top).toBe('50%')
	})

	it('ignores layout entries whose item never mounted', () => {
		const { container } = renderUI(
			<DashboardGrid
				aria-label="Sales"
				layout={{ value: [{ id: 'ghost', x: 0, y: 0, w: 24, h: 18 }, ...WIDE] }}
			>
				<DashboardItem id="a" ratio={16 / 9}>
					<div />
				</DashboardItem>

				<DashboardItem id="b" ratio={16 / 9}>
					<div />
				</DashboardItem>
			</DashboardGrid>,
		)

		expect(allBySlot(container, 'dashboard-item')).toHaveLength(2)

		// The ghost's row is not reserved: both tiles slide to the top.
		expect(allBySlot(container, 'dashboard-item')[0]?.style.top).toBe('0%')
	})

	it('mounts editing chrome only in editing mode', () => {
		const rest = renderUI(board(false))

		expect(bySlot(rest.container, 'dashboard-handle')).toBeNull()

		expect(bySlot(rest.container, 'dashboard-resize-handle')).toBeNull()

		expect(bySlot(rest.container, 'dashboard-grid')?.dataset.editing).toBeUndefined()

		const editing = renderUI(board(true))

		expect(bySlot(editing.container, 'dashboard-grid')?.dataset.editing).toBe('')

		expect(allBySlot(editing.container, 'dashboard-handle').length).toBeGreaterThan(0)

		expect(allBySlot(editing.container, 'dashboard-resize-handle').length).toBeGreaterThan(0)
	})

	it('mounts no editing chrome on a static tile', () => {
		const { container } = renderUI(
			<DashboardGrid
				aria-label="Sales"
				editing
				layout={{ value: [{ id: 'pinned', x: 0, y: 0, w: 12, h: 18, static: true }] }}
			>
				<DashboardItem id="pinned">
					<div />
				</DashboardItem>
			</DashboardGrid>,
		)

		expect(bySlot(container, 'dashboard-handle')).toBeNull()

		expect(bySlot(container, 'dashboard-resize-handle')).toBeNull()
	})

	it('commits a keyboard resize through the binding with both event brackets', () => {
		const onValueChange = vi.fn()

		const onResizeStart = vi.fn()

		const onResizeEnd = vi.fn()

		const { container } = renderUI(
			<DashboardGrid
				aria-label="Sales"
				editing
				layout={{ defaultValue: WIDE, onValueChange }}
				onResizeStart={onResizeStart}
				onResizeEnd={onResizeEnd}
			>
				<DashboardItem id="a" ratio={16 / 9}>
					<div />
				</DashboardItem>

				<DashboardItem id="b" ratio={16 / 9}>
					<div />
				</DashboardItem>
			</DashboardGrid>,
		)

		const east = container.querySelector('[data-slot="dashboard-resize-handle"][data-edge="e"]')

		expect(east).not.toBeNull()

		if (east) fireEvent.keyDown(east, { key: 'ArrowRight' })

		expect(onResizeStart).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'a', layout: expect.any(Array) }),
		)

		const committed = onValueChange.mock.calls.at(-1)?.[0] as DashboardLayoutItem[]

		expect(committed.find((item) => item.id === 'a')?.w).toBe(13)

		// Ratio-locked tiles emit without a stored height.
		expect(committed.find((item) => item.id === 'a')?.h).toBeUndefined()

		// The widened tile overlaps its neighbour, which compacts below it.
		expect(committed.find((item) => item.id === 'b')?.y).toBeGreaterThan(0)

		expect(onResizeEnd).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', canceled: false }))
	})

	it('survives StrictMode double-mounting', () => {
		const { container } = renderUI(<StrictMode>{board(true)}</StrictMode>)

		expect(allBySlot(container, 'dashboard-item')).toHaveLength(2)
	})
})
