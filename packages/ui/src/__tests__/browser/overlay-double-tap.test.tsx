import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Drawer, DrawerPanel } from '../../components/drawer'
import { MULTI_TAP_WINDOW } from '../../hooks/use-touch-tap'
import { frames, renderUI, screen } from '../helpers'

/**
 * A double tap on a control that opens an overlay on one tap. The first tap
 * opens the overlay, and the second tap lands on it. That tap must not close the
 * overlay from the backdrop, and it must not press a control in the panel. A
 * tap after the run acts as before. jsdom does no hit test, so the browser
 * finds the element under each tap.
 */
describe('overlay: the second tap of a double tap (real browser)', () => {
	/**
	 * Sends the events of a tap of a finger to the element under `x`, `y`: the
	 * press, the lift, and the click. The time stamp of each event is `later` ms
	 * after the time of the browser.
	 */
	function tapAt(x: number, y: number, later = 0) {
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

		stamp(
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
				clientX: x,
				clientY: y,
				detail: 1,
			}),
		)
	}

	function setup() {
		const onInside = vi.fn()

		// Opens on the lift of a touch, as a tap on a Map point does.
		function Harness() {
			const [open, setOpen] = useState(false)

			return (
				<>
					<button type="button" onPointerUp={() => setOpen(true)}>
						Open
					</button>

					<Drawer open={open} onOpenChange={setOpen}>
						<DrawerPanel aria-label="Panel">
							<button type="button" onClick={onInside}>
								Inside
							</button>
						</DrawerPanel>
					</Drawer>
				</>
			)
		}

		renderUI(<Harness />)

		const center = (name: string) => {
			const box = screen.getByRole('button', { name }).getBoundingClientRect()

			return [box.left + box.width / 2, box.top + box.height / 2] as const
		}

		return { onInside, center, isOpen: () => screen.queryByRole('dialog') !== null }
	}

	it('stays open on the second tap of a double tap on the backdrop', async () => {
		const { center, isOpen } = setup()

		const [x, y] = center('Open')

		tapAt(x, y)

		await frames(2)

		expect(isOpen()).toBe(true)

		// The second tap lands where the first did, which is now the backdrop.
		expect(document.elementFromPoint(x, y)?.getAttribute('data-slot')).toBe('overlay-backdrop')

		tapAt(x, y)

		await frames(2)

		expect(isOpen()).toBe(true)
	})

	it('closes on a tap on the backdrop after the run', async () => {
		const { center, isOpen } = setup()

		const [x, y] = center('Open')

		tapAt(x, y)

		await frames(2)

		tapAt(x, y, MULTI_TAP_WINDOW)

		await frames(2)

		expect(isOpen()).toBe(false)
	})

	it('presses nothing in the panel until the run is over', async () => {
		const { onInside, center } = setup()

		const [x, y] = center('Open')

		tapAt(x, y)

		await frames(2)

		const [ix, iy] = center('Inside')

		tapAt(ix, iy)

		expect(onInside).not.toHaveBeenCalled()

		tapAt(ix, iy, MULTI_TAP_WINDOW)

		expect(onInside).toHaveBeenCalledTimes(1)
	})
})
