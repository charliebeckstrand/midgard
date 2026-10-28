import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { GRID_DOUBLE_TAP_WINDOW } from '../../modules/grid/use-grid-touch-entry'
import { fireEvent, frames, present, renderUI, waitFor } from '../helpers'

/**
 * A double tap on the column resize handle auto-sizes the column, as a
 * double-click does. A touch screen sends no double-click, and the touch end
 * of the drag-resize of the engine cancels the mouse events of each tap. The
 * engine ends the drag of the second tap from its touch end listener on the
 * document, and that end writes the width of the drag. Thus only real browser
 * events show that the auto-size comes after that write.
 */
describe('grid resize handle: double tap (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, width: '80px' },
		{ id: 'more', title: 'More', cell: () => 'More' },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Wade Cooper of the long name' },
		{ id: 2, name: 'Arlene McCoy' },
	]

	beforeEach(() => {
		// A script-made pointer is not an active pointer, so the browser refuses to
		// capture it. A real press takes the capture.
		vi.spyOn(Element.prototype, 'setPointerCapture').mockImplementation(() => {})
	})

	async function setup() {
		const { container } = renderUI(
			<div style={{ width: '600px' }}>
				<Grid resizable columns={columns} rows={rows} getKey={(row) => row.id} />
			</div>,
		)

		const table = present(container.querySelector('table'), 'table')

		await waitFor(() => expect(table.style.width).not.toBe(''))

		const separator = present(
			container.querySelector<HTMLElement>('hr[aria-label="Resize Name"]'),
			'the resize handle',
		)

		const header = present(
			container.querySelector<HTMLElement>('th[data-grid-col="name"]'),
			'the name header',
		)

		return { separator, width: () => header.getBoundingClientRect().width }
	}

	/**
	 * Sends the events of a tap of a finger on `target`, in the order of a
	 * browser: the pointer event, then the touch event. The finger moves `drift`
	 * px before it lifts, as a real finger does.
	 */
	function tap(target: HTMLElement, drift = 0) {
		const rect = target.getBoundingClientRect()

		const x = rect.left + rect.width / 2

		const y = rect.top + rect.height / 2

		const pointer = {
			bubbles: true,
			cancelable: true,
			pointerType: 'touch',
			isPrimary: true,
			pointerId: 7,
			clientY: y,
		}

		const touchAt = (clientX: number) => new Touch({ identifier: 7, target, clientX, clientY: y })

		target.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientX: x }))

		target.dispatchEvent(
			new TouchEvent('touchstart', {
				bubbles: true,
				cancelable: true,
				touches: [touchAt(x)],
				changedTouches: [touchAt(x)],
			}),
		)

		if (drift !== 0) {
			target.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: x + drift }))

			target.dispatchEvent(
				new TouchEvent('touchmove', {
					bubbles: true,
					cancelable: true,
					touches: [touchAt(x + drift)],
					changedTouches: [touchAt(x + drift)],
				}),
			)
		}

		target.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientX: x + drift }))

		target.dispatchEvent(
			new TouchEvent('touchend', {
				bubbles: true,
				cancelable: true,
				touches: [],
				changedTouches: [touchAt(x + drift)],
			}),
		)
	}

	it('auto-sizes the column to the width that a double-click gives', async () => {
		const { separator, width } = await setup()

		const start = width()

		tap(separator)

		await frames()

		// One tap is not a double tap.
		expect(width()).toBe(start)

		// The finger drifts on the second tap. The width of that drag must not
		// take the place of the auto-size.
		tap(separator, 3)

		await frames()

		const tapped = width()

		expect(tapped).toBeGreaterThan(start + 20)

		fireEvent.doubleClick(separator)

		await frames()

		expect(width()).toBe(tapped)
	})

	it('does not auto-size on two taps farther apart than the window', async ({ signal }) => {
		const { separator, width } = await setup()

		signal.throwIfAborted()

		let now = 1000

		vi.spyOn(performance, 'now').mockImplementation(() => now)

		const start = width()

		tap(separator)

		now += GRID_DOUBLE_TAP_WINDOW + 1

		tap(separator)

		await frames()

		expect(width()).toBe(start)
	})
})
