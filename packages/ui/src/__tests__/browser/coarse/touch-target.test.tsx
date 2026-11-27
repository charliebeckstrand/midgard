import { describe, expect, it } from 'vitest'
import { TouchTarget } from '../../../primitives/touch-target'
import { present, renderUI, screen } from '../../helpers'
import { getCenter } from '../../helpers/geometry/box'

/**
 * The activation region of `TouchTarget` on a coarse pointer, measured in a real
 * browser. On a touch screen, the hit area of a small host takes the 44px floor
 * (WCAG 2.5.5, enhanced). The host box stays at its own size.
 * `geometry/touch-target-geometry.test.tsx` holds the 24px floor of a fine
 * pointer and the caps of a row or a stack.
 */
describe('TouchTarget activation region on a coarse pointer (real browser)', () => {
	/** A host of `size` px, laid out the way `Button` lays out its host. */
	const renderHost = (size: number) =>
		renderUI(
			<div style={{ padding: '64px' }}>
				<button
					type="button"
					aria-label="Host"
					style={{ position: 'relative', width: size, height: size, padding: 0, border: 0 }}
				>
					<TouchTarget>
						<span />
					</TouchTarget>
				</button>
			</div>,
		)

	/** The host, its box, and the box of its expansion span. */
	const measure = () => {
		const host = screen.getByRole('button', { name: 'Host' })

		const span = present(host.querySelector('[aria-hidden="true"]'), 'the expansion span')

		return { host, box: span.getBoundingClientRect(), hostBox: host.getBoundingClientRect() }
	}

	/** Whether a point resolves to the host, through the span or directly. */
	const hitsHost = (host: HTMLElement, x: number, y: number) =>
		document.elementFromPoint(x, y)?.closest('button') === host

	it('floors the activation region at 44px, centered on the host', () => {
		renderHost(16)

		const { host, box, hostBox } = measure()

		// The host box stays at its own size; only the hit area grows.
		expect(hostBox.width).toBe(16)

		expect(box.width).toBe(44)

		expect(box.height).toBe(44)

		expect(getCenter(box)).toEqual(getCenter(hostBox))

		// A point past the 24px floor of a mouse, and inside the 44px floor, activates the host.
		expect(hitsHost(host, hostBox.right + 10, hostBox.top + 8)).toBe(true)

		expect(hitsHost(host, hostBox.left + 8, hostBox.top - 10)).toBe(true)

		// A point past the floor does not.
		expect(hitsHost(host, box.right + 2, hostBox.top + 8)).toBe(false)
	})

	it('collapses onto a host already at or above the floor', () => {
		renderHost(48)

		const { box, hostBox } = measure()

		expect(box.width).toBe(hostBox.width)

		expect(box.height).toBe(hostBox.height)
	})
})
