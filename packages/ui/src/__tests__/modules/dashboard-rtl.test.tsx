import { act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../modules/dashboard'
import { inlineSign } from '../../modules/dashboard/engine/dashboard-layout'
import { fireEvent, renderUI, screen } from '../helpers'
import {
	lastEntry,
	pressSplitter,
	settleKeyboardLifts,
	stubCanvasWidth,
	useControlledLayout,
} from '../helpers/dashboard-board'

stubCanvasWidth()

settleKeyboardLifts()

describe('inlineSign', () => {
	it('is -1 for a right-to-left direction, and 1 for each other value', () => {
		expect(inlineSign('rtl')).toBe(-1)

		expect(inlineSign('ltr')).toBe(1)

		expect(inlineSign(undefined)).toBe(1)

		expect(inlineSign(null)).toBe(1)
	})
})

/** A controlled board in `dir`, which reports each committed layout. */
function Board({
	dir,
	onLayout,
}: {
	dir: 'ltr' | 'rtl'
	onLayout: (next: DashboardLayoutItem[]) => void
}) {
	const layout = useControlledLayout([{ id: 'a', x: 4, y: 0, w: 8, h: 10 }], onLayout)

	return (
		<div dir={dir}>
			<Dashboard aria-label="Board" editing layout={layout}>
				<DashboardTile id="a" title="A" minWidth={0} />
			</Dashboard>
		</div>
	)
}

describe('a right-to-left board', () => {
	it('grows the end edge with the left arrow, as the edge sits on the left', () => {
		const onLayout = vi.fn()

		renderUI(<Board dir="rtl" onLayout={onLayout} />)

		pressSplitter('A', 0, 'ArrowLeft')

		expect(lastEntry(onLayout, 'a')).toMatchObject({ x: 4, w: 9 })

		pressSplitter('A', 0, 'ArrowRight')

		pressSplitter('A', 0, 'ArrowRight')

		expect(lastEntry(onLayout, 'a')).toMatchObject({ x: 4, w: 7 })
	})

	it('keeps the arrow keys of a left-to-right board', () => {
		const onLayout = vi.fn()

		renderUI(<Board dir="ltr" onLayout={onLayout} />)

		pressSplitter('A', 0, 'ArrowRight')

		expect(lastEntry(onLayout, 'a')).toMatchObject({ x: 4, w: 9 })
	})

	it.each([
		['rtl', 'ArrowLeft', 6],
		['rtl', 'ArrowRight', 2],
		['ltr', 'ArrowLeft', 2],
		['ltr', 'ArrowRight', 6],
	] as const)('moves a tile of a %s board with %s to column %i', async (dir, code, x) => {
		const onLayout = vi.fn()

		renderUI(<Board dir={dir} onLayout={onLayout} />)

		const grip = screen.getByRole('button', { name: 'Move A' })

		grip.focus()

		fireEvent.keyDown(grip, { code: 'Space', key: ' ' })

		// The keyboard sensor attaches its keys on a timer after the lift.
		await act(() => new Promise((resolve) => setTimeout(resolve, 0)))

		fireEvent.keyDown(grip, { code, key: code })

		fireEvent.keyDown(grip, { code, key: code })

		fireEvent.keyDown(grip, { code: 'Space', key: ' ' })

		expect(lastEntry(onLayout, 'a')).toMatchObject({ x, y: 0, w: 8 })
	})
})
