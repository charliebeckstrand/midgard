import { act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
	Dashboard,
	type DashboardLayoutItem,
	type DashboardProps,
	DashboardTile,
} from '../../modules/dashboard'
import { k } from '../../recipes/kata/dashboard'
import { fireEvent, renderUI, screen, tick } from '../helpers'
import { settleKeyboardLifts, stubCanvasWidth } from '../helpers/dashboard-board'

/**
 * A lift, a cancel, or a drop renders only the card of the tile that moves.
 *
 * Each render of a card calls the unit of the dashboard once with the drag flag
 * of its tile. The count needs a module mock, so this suite sits in `boundary/`.
 */
vi.mock('../../recipes/kata/dashboard', async (importActual) => {
	const actual = await importActual<typeof import('../../recipes/kata/dashboard')>()

	return { ...actual, k: Object.assign(vi.fn(actual.k), actual.k) }
})

const LAYOUT: DashboardLayoutItem[] = [
	{ id: 'a', x: 0, y: 0, w: 12 },
	{ id: 'b', x: 12, y: 0, w: 12 },
	{ id: 'c', x: 0, y: 27, w: 8, h: 20 },
]

stubCanvasWidth()

settleKeyboardLifts()

function Board({
	editing = false,
	layout = { defaultValue: LAYOUT },
}: {
	editing?: boolean
	layout?: DashboardProps['layout']
}) {
	return (
		<Dashboard aria-label="Sales" editing={editing} layout={layout}>
			<DashboardTile id="a" title="Revenue" ratio={16 / 9}>
				<button type="button">Inside a</button>
			</DashboardTile>

			<DashboardTile id="b" title="Traffic" ratio={16 / 9}>
				<div data-testid="content-b" />
			</DashboardTile>

			<DashboardTile id="c">
				<div data-testid="content-c" />
			</DashboardTile>
		</Dashboard>
	)
}

describe('dashboard card renders', () => {
	it('renders no card of a tile that a lift, a cancel, or a drop does not move', async () => {
		const onValueChange = vi.fn()

		renderUI(<Board editing layout={{ defaultValue: LAYOUT, onValueChange }} />)

		const grip = screen.getByRole('button', { name: 'Move Revenue' })

		grip.focus()

		// Each render of a card calls the unit once with the drag flag of its tile,
		// and no other part passes that flag.
		const cards = vi.mocked(k)

		cards.mockClear()

		const flags = () =>
			cards.mock.calls.flatMap(([variants]) =>
				variants && 'dragging' in variants ? [variants.dragging] : [],
			)

		// The keyboard sensor attaches its keys on a timer after the lift.
		const settle = () => act(tick)

		// A lift changes the dnd-kit context, which each tile reads.
		fireEvent.keyDown(grip, { code: 'Space', key: ' ' })

		expect(flags()).toEqual([true])

		await settle()

		cards.mockClear()

		// Escape cancels the drag.
		fireEvent.keyDown(grip, { code: 'Escape', key: 'Escape' })

		expect(flags()).toEqual([false])

		// Space drops the drag, and the drop commits a reorder with Traffic.
		fireEvent.keyDown(grip, { code: 'Space', key: ' ' })

		await settle()

		// Twelve columns to the right, Revenue covers the cell of Traffic.
		for (let step = 0; step < 12; step++) {
			fireEvent.keyDown(grip, { code: 'ArrowRight', key: 'ArrowRight' })
		}

		cards.mockClear()

		fireEvent.keyDown(grip, { code: 'Space', key: ' ' })

		await settle()

		expect(onValueChange).toHaveBeenCalledTimes(1)

		expect(flags()).toEqual([false])
	})
})
