import { describe, expect, it } from 'vitest'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../modules/dashboard'
import { allBySlot, renderUI, waitFor } from '../helpers'

/**
 * The dashboard derives its rows from the container width in CSS alone: a
 * `100cqi` fraction on an inline-size container. jsdom lays nothing out, so the
 * geometry claims run here, in a real engine.
 */
describe('dashboard geometry (real browser)', () => {
	const layout: DashboardLayoutItem[] = [
		{ id: 'a', x: 0, y: 0, w: 12 },
		{ id: 'b', x: 12, y: 0, w: 12 },
		{ id: 'c', x: 0, y: 27, w: 8, h: 20 },
	]

	function board(width: number) {
		return (
			<div style={{ width }}>
				<Dashboard aria-label="Sales" layout={{ defaultValue: layout }} gap={0}>
					<DashboardTile id="a" ratio={16 / 9} minWidth={120}>
						<div />
					</DashboardTile>

					<DashboardTile id="b" ratio={16 / 9} minWidth={120}>
						<div />
					</DashboardTile>

					<DashboardTile id="c" minWidth={120}>
						<div />
					</DashboardTile>
				</Dashboard>
			</div>
		)
	}

	it('derives the row unit and the tile heights from the width alone', () => {
		const { container } = renderUI(board(960))

		const [a, b, c] = allBySlot(container, 'dashboard-tile').map((tile) =>
			tile.getBoundingClientRect(),
		)

		// 960 px over 24 columns is a 40 px pitch, so a row is 10 px.
		expect(a?.width).toBeCloseTo(480, 0)

		expect(a?.height).toBeCloseTo(270, 0)

		// Two equal ratio tiles have the same height, by construction.
		expect(b?.height).toBe(a?.height)

		expect(c?.top).toBeCloseTo((a?.top ?? 0) + 270, 0)

		expect(c?.height).toBeCloseTo(200, 0)
	})

	it('re-packs into a stack when the container starves the tiles', async () => {
		const { container } = renderUI(
			<div style={{ width: 360 }}>
				<Dashboard aria-label="Sales" layout={{ defaultValue: layout }} gap={0}>
					<DashboardTile id="a" ratio={16 / 9}>
						<div />
					</DashboardTile>

					<DashboardTile id="b" ratio={16 / 9}>
						<div />
					</DashboardTile>
				</Dashboard>
			</div>,
		)

		// Each tile demands 320 px, and 12 columns of 360 px is 180 px.
		await waitFor(() => {
			const widths = allBySlot(container, 'dashboard-tile').map(
				(tile) => tile.getBoundingClientRect().width,
			)

			expect(widths).toEqual([360, 360])
		})
	})
})
