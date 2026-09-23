// The provider types augment `CDPSession` with `send`; nothing else in the
// suite loads them, because no other file reaches the raw protocol.
import type {} from '@vitest/browser-playwright'
import { afterEach, describe, expect, it } from 'vitest'
import { cdp } from 'vitest/browser'
import { TouchTarget } from '../../primitives/touch-target'
import { present, renderUI, screen } from '../helpers'

/**
 * The activation region of `TouchTarget`, measured in a real browser. The
 * doccomment claims that the floor holds the hit area and never the host box
 * (WCAG 2.5.8 measures the activation region). jsdom runs no layout, so the
 * unit suite can assert only the classes. This file measures the box those
 * classes resolve to and the element that a point hits.
 *
 * Axe cannot stand in for this pin. Its target-size rule measures the host's
 * own border-box and never sees the span.
 */
describe('TouchTarget activation region (real browser)', () => {
	/** A host under the 24px floor, laid out the way `Button` lays out its host. */
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

	/** The host and the box of its expansion span. */
	const measure = () => {
		const host = screen.getByRole('button', { name: 'Host' })

		const span = present(host.querySelector('[aria-hidden="true"]'), 'the expansion span')

		return { host, box: span.getBoundingClientRect(), hostBox: host.getBoundingClientRect() }
	}

	/** Whether a point resolves to the host, through the span or directly. */
	const hitsHost = (host: HTMLElement, x: number, y: number) =>
		document.elementFromPoint(x, y)?.closest('button') === host

	afterEach(async () => {
		await cdp().send('Emulation.setTouchEmulationEnabled', { enabled: false })
	})

	it('floors the activation region at 24px on a fine pointer, centred on the host', () => {
		expect(matchMedia('(pointer: fine)').matches).toBe(true)

		renderHost(16)

		const { host, box, hostBox } = measure()

		// The host box stays at its own size; only the hit area grows.
		expect(hostBox.width).toBe(16)

		expect(box.width).toBe(24)

		expect(box.height).toBe(24)

		expect(box.left + box.width / 2).toBe(hostBox.left + hostBox.width / 2)

		expect(box.top + box.height / 2).toBe(hostBox.top + hostBox.height / 2)

		// A point outside the host box, and inside the floor, activates the host.
		expect(hitsHost(host, hostBox.right + 3, hostBox.top + 8)).toBe(true)

		expect(hitsHost(host, hostBox.left + 8, hostBox.top - 3)).toBe(true)

		// A point past the floor does not.
		expect(hitsHost(host, box.right + 2, hostBox.top + 8)).toBe(false)
	})

	it('collapses onto a host already at or above the floor', () => {
		renderHost(40)

		const { box, hostBox } = measure()

		expect(box.width).toBe(hostBox.width)

		expect(box.height).toBe(hostBox.height)
	})

	it('raises the floor to 44px on a coarse pointer', async () => {
		await cdp().send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })

		expect(matchMedia('(pointer: coarse)').matches).toBe(true)

		renderHost(16)

		const { host, box, hostBox } = measure()

		expect(box.width).toBe(44)

		expect(box.height).toBe(44)

		expect(hitsHost(host, hostBox.right + 12, hostBox.top + 8)).toBe(true)
	})
})
