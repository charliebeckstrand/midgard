import { describe, expect, it } from 'vitest'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../../modules/dashboard'
import { allBySlot, getSlot, renderUI, screen, waitFor } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

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
		expect(a?.width).toBeNear(480, HALF_PIXEL)

		expect(a?.height).toBeNear(270, HALF_PIXEL)

		// Two equal ratio tiles have the same height, by construction.
		expect(b?.height).toBe(a?.height)

		expect(c?.top).toBeNear((a?.top ?? 0) + 270, HALF_PIXEL)

		expect(c?.height).toBeNear(200, HALF_PIXEL)
	})

	it('lines the outer cards up with the container edges, and keeps the gutter', () => {
		const { container } = renderUI(
			<div style={{ width: 960 }}>
				<Dashboard aria-label="Sales" layout={{ defaultValue: layout }}>
					<DashboardTile id="a" ratio={16 / 9} minWidth={120}>
						<div />
					</DashboardTile>

					<DashboardTile id="b" ratio={16 / 9} minWidth={120}>
						<div />
					</DashboardTile>
				</Dashboard>
			</div>,
		)

		const board = container.querySelector('[data-slot="dashboard"]')?.getBoundingClientRect()

		const [a, b] = Array.from(
			container.querySelectorAll('[data-slot="dashboard-tile"] > [data-slot="card"]'),
		).map((card) => card.getBoundingClientRect())

		expect(a?.left).toBeNear(board?.left ?? 0, HALF_PIXEL)

		expect(b?.right).toBeNear(board?.right ?? 0, HALF_PIXEL)

		expect(a?.top).toBeNear(board?.top ?? 0, HALF_PIXEL)

		// The default gutter stays between the two cards.
		expect((b?.left ?? 0) - (a?.right ?? 0)).toBeNear(12, HALF_PIXEL)
	})

	it('sizes a container unit of a widget by its content box, and not by the board', () => {
		// 6 of 24 columns on a 960 px board is a tile of 240 px.
		const { container } = renderUI(
			<div style={{ width: 960 }}>
				<Dashboard aria-label="Sales" layout={{ value: [{ id: 'a', x: 0, y: 0, w: 6, h: 20 }] }}>
					<DashboardTile id="a" minWidth={0}>
						<div data-testid="probe" className="h-2 w-[50cqi]" />
					</DashboardTile>
				</Dashboard>
			</div>,
		)

		const box = getSlot(container, 'dashboard-tile-content').getBoundingClientRect()

		const probe = screen.getByTestId('probe').getBoundingClientRect()

		expect(box.width).toBeLessThan(240)

		expect(probe.width).toBeNear(box.width / 2, HALF_PIXEL)
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
