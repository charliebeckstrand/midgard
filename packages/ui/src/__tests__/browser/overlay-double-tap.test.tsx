import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { Drawer, DrawerPanel } from '../../components/drawer'
import { MULTI_TAP_DISTANCE, MULTI_TAP_WINDOW } from '../../hooks/use-touch-tap'
import { frames, renderUI, screen } from '../helpers'

/**
 * A double tap on a control that opens an overlay on one tap. The first tap
 * opens the overlay, and the second tap lands on it. That tap must not close the
 * overlay from the backdrop, press a control in the panel, or move the focus. A
 * tap after the run, or a tap away from the first one, acts as before. jsdom
 * does no hit test, so the browser finds the element under each tap.
 */
describe('overlay: the second tap of a double tap (real browser)', () => {
	/**
	 * Sends the events of a tap of a finger to the element under `x`, `y`: the
	 * press, the lift, the `mousedown`, and the click. The `count` is the place of
	 * the tap in its run, and a second tap also sends a `dblclick`. The time stamp
	 * of each event is `later` ms after the time of the browser. Returns the
	 * `mousedown`, whose default action moves the focus in a real tap.
	 */
	function tapAt(x: number, y: number, later = 0, count = 1): MouseEvent {
		const target = document.elementFromPoint(x, y)

		if (target === null) throw new Error('Nothing under the tap')

		const stamp = (event: Event) => {
			Object.defineProperty(event, 'timeStamp', { value: event.timeStamp + later })

			target.dispatchEvent(event)
		}

		const pointer = {
			bubbles: true,
			cancelable: true,
			pointerType: 'touch',
			isPrimary: true,
			pointerId: 9,
			clientX: x,
			clientY: y,
		}

		stamp(new PointerEvent('pointerdown', pointer))

		stamp(new PointerEvent('pointerup', pointer))

		const mouse = { bubbles: true, cancelable: true, clientX: x, clientY: y, detail: count }

		const mousedown = new MouseEvent('mousedown', mouse)

		stamp(mousedown)

		stamp(new MouseEvent('mouseup', mouse))

		stamp(new MouseEvent('click', mouse))

		if (count === 2) stamp(new MouseEvent('dblclick', mouse))

		return mousedown
	}

	/**
	 * Renders an opener that fills the page and a Drawer. A `field` panel holds a
	 * small field, so the middle of the page is backdrop. Else the panel holds a
	 * button that fills it, so the middle of the page is that button.
	 */
	function setup({ field = false } = {}) {
		const onInside = vi.fn()

		// Opens on the lift of a touch, as a tap on a Map point does.
		function Harness() {
			const [open, setOpen] = useState(false)

			return (
				<>
					<button
						type="button"
						data-testid="opener"
						className="h-dvh w-full"
						onPointerUp={() => setOpen(true)}
					>
						Open
					</button>

					<Drawer open={open} onOpenChange={setOpen}>
						<DrawerPanel aria-label="Panel">
							{field ? (
								<input aria-label="Name" />
							) : (
								<button
									type="button"
									className="h-dvh w-full"
									onClick={onInside}
									onDoubleClick={onInside}
								>
									Inside
								</button>
							)}
						</DrawerPanel>
					</Drawer>
				</>
			)
		}

		renderUI(<Harness />)

		const x = innerWidth / 2

		const y = innerHeight / 2

		const slotAt = (px: number, py: number) =>
			document.elementFromPoint(px, py)?.getAttribute('data-slot')

		return { onInside, x, y, slotAt, isOpen: () => screen.queryByRole('dialog') !== null }
	}

	it('stays open on the second tap of a double tap on the backdrop', async () => {
		const { x, y, slotAt, isOpen } = setup({ field: true })

		tapAt(x, y)

		await frames(2)

		expect(isOpen()).toBe(true)

		// The second tap lands where the first did, which is now the backdrop.
		expect(slotAt(x, y)).toBe('overlay-backdrop')

		tapAt(x, y, 0, 2)

		await frames(2)

		expect(isOpen()).toBe(true)
	})

	it('closes on a tap on the backdrop after the run', async () => {
		const { x, y, isOpen } = setup({ field: true })

		tapAt(x, y)

		await frames(2)

		tapAt(x, y, MULTI_TAP_WINDOW + 1)

		await frames(2)

		expect(isOpen()).toBe(false)
	})

	it('presses nothing in the panel on the second tap of the run', async () => {
		const { onInside, x, y } = setup()

		tapAt(x, y)

		await frames(2)

		expect(
			screen.getByRole('button', { name: 'Inside' }).contains(document.elementFromPoint(x, y)),
		).toBe(true)

		tapAt(x, y + MULTI_TAP_DISTANCE / 2, 0, 2)

		expect(onInside).not.toHaveBeenCalled()

		tapAt(x, y, MULTI_TAP_WINDOW + 1)

		expect(onInside).toHaveBeenCalledTimes(1)
	})

	it('presses a control away from the first tap at once', async () => {
		const { onInside, x, y } = setup()

		tapAt(x, y)

		await frames(2)

		// In the window, but too far from the first tap to be a double tap.
		expect(tapAt(x, y + MULTI_TAP_DISTANCE * 2).defaultPrevented).toBe(false)

		expect(onInside).toHaveBeenCalledTimes(1)
	})

	it('keeps the focus where the open put it on the second tap', async () => {
		setup({ field: true })

		// A real tap, because the default action of its `mousedown` moves the focus.
		await commands.tapPointer('[data-testid="opener"]')

		await frames(2)

		const field = screen.getByRole('textbox', { name: 'Name' })

		expect(document.activeElement).toBe(field)

		await commands.tapPointer('[data-testid="opener"]')

		await frames(2)

		expect(screen.queryByRole('dialog')).not.toBeNull()

		expect(document.activeElement).toBe(field)
	})
})
