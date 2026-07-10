import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardGrid, DashboardItem, type DashboardLayoutItem } from '../../modules/dashboard'
import { allBySlot, fireEvent, renderUI } from '../helpers'

const originalClientWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')

beforeEach(() => {
	Object.defineProperty(Element.prototype, 'clientWidth', {
		configurable: true,
		get: () => 960,
	})
})

afterEach(() => {
	if (originalClientWidth) {
		Object.defineProperty(Element.prototype, 'clientWidth', originalClientWidth)
	}
})

/** One editing board: a ratio-locked tile beside a free-form one. */
function board(onValueChange?: (layout: DashboardLayoutItem[]) => void) {
	return (
		<DashboardGrid
			aria-label="Sales"
			editing
			layout={{
				defaultValue: [
					{ id: 'locked', x: 0, y: 0, w: 12 },
					{ id: 'free', x: 12, y: 0, w: 12, h: 20 },
				],
				onValueChange,
			}}
		>
			<DashboardItem id="locked" ratio={16 / 9}>
				<div />
			</DashboardItem>

			<DashboardItem id="free">
				<div />
			</DashboardItem>
		</DashboardGrid>
	)
}

/** The handles inside one tile, keyed by edge. */
function handlesOf(container: HTMLElement, id: string) {
	const item = allBySlot(container, 'dashboard-item').find(
		(candidate) => candidate.querySelector(`[aria-label="Move ${id}"]`) !== null,
	)

	const handles = item ? [...item.querySelectorAll('[data-slot="dashboard-resize-handle"]')] : []

	return new Map(handles.map((handle) => [handle.getAttribute('data-edge'), handle]))
}

describe('dashboard resize handles', () => {
	it('mounts a south splitter only on free-form tiles', () => {
		const { container } = renderUI(board())

		expect([...handlesOf(container, 'locked').keys()].sort()).toEqual(['e', 'se'])

		expect([...handlesOf(container, 'free').keys()].sort()).toEqual(['e', 's', 'se'])
	})

	it('speaks separator semantics on the axis splitters and hides the corner', () => {
		const { container } = renderUI(board())

		const east = handlesOf(container, 'free').get('e')

		expect(east?.getAttribute('role')).toBe('separator')

		expect(east?.getAttribute('aria-orientation')).toBe('vertical')

		expect(east?.getAttribute('aria-valuenow')).toBe('12')

		expect(east?.getAttribute('aria-valuemax')).toBe('12')

		const south = handlesOf(container, 'free').get('s')

		expect(south?.getAttribute('aria-orientation')).toBe('horizontal')

		expect(south?.getAttribute('aria-valuenow')).toBe('20')

		const corner = handlesOf(container, 'free').get('se')

		expect(corner?.getAttribute('aria-hidden')).toBe('true')

		expect(corner?.getAttribute('tabindex')).toBeNull()
	})

	it('steps height by row on the south splitter and re-derives nothing on the ratio tile', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(board(onValueChange))

		const south = handlesOf(container, 'free').get('s')

		if (south) fireEvent.keyDown(south, { key: 'ArrowDown' })

		const committed = onValueChange.mock.calls.at(-1)?.[0] as DashboardLayoutItem[]

		expect(committed.find((item) => item.id === 'free')?.h).toBe(21)

		// The neighbour never moved and the ratio tile still stores no height.
		expect(committed.find((item) => item.id === 'locked')?.h).toBeUndefined()
	})

	it('clamps a width shrink at the tile minimum and never below', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(board(onValueChange))

		const east = handlesOf(container, 'free').get('e')

		// 960px over 24 columns is 40px a column; 240px + one 8px gap needs 7.
		if (east) fireEvent.keyDown(east, { key: 'Home' })

		const committed = onValueChange.mock.calls.at(-1)?.[0] as DashboardLayoutItem[]

		expect(committed.find((item) => item.id === 'free')?.w).toBe(7)
	})

	it('grows to the remaining columns with End and no further', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(board(onValueChange))

		const east = handlesOf(container, 'locked').get('e')

		if (east) fireEvent.keyDown(east, { key: 'End' })

		const committed = onValueChange.mock.calls.at(-1)?.[0] as DashboardLayoutItem[]

		expect(committed.find((item) => item.id === 'locked')?.w).toBe(24)

		// Its neighbour wraps below rather than overlapping.
		expect(committed.find((item) => item.id === 'free')?.y).toBeGreaterThan(0)
	})
})
