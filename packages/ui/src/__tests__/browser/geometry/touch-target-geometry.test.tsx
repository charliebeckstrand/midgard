import type { CSSProperties } from 'react'
import { describe, expect, it } from 'vitest'
import { TouchTarget } from '../../../primitives/touch-target'
import { present, renderUI, screen } from '../../helpers'
import { centerOf } from '../../helpers/geometry/box'

/**
 * The activation region of `TouchTarget`, measured in a real browser. The
 * doccomment claims that the floor holds the hit area and never the host box
 * (WCAG 2.5.8 measures the activation region). jsdom runs no layout, so the
 * unit suite can assert only the classes. This file measures the box those
 * classes resolve to and the element that a point hits.
 *
 * Axe cannot stand in for this pin. Its target-size rule measures the host's
 * own border-box and never sees the span.
 *
 * The 44px coarse floor has no case here, because this suite cannot match a
 * coarse pointer. `Emulation.setTouchEmulationEnabled` makes `pointer: coarse`
 * match, but turning it off does not restore `hover: hover` or `pointer: fine`.
 * The suite runs with `isolate: false`, so every later file on the page loses
 * its `hover:` variants. The jsdom suite asserts the coarse class instead, and
 * `hit-area-overlap.test.tsx` sets the 44px floor on the span with a stylesheet.
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

	/** The host, its box, and the box of its expansion span. */
	const measure = (name = 'Host') => {
		const host = screen.getByRole('button', { name })

		const span = present(host.querySelector('[aria-hidden="true"]'), 'the expansion span')

		return { host, box: span.getBoundingClientRect(), hostBox: host.getBoundingClientRect() }
	}

	/** Whether a point resolves to the host, through the span or directly. */
	const hitsHost = (host: HTMLElement, x: number, y: number) =>
		document.elementFromPoint(x, y)?.closest('button') === host

	it('floors the activation region at 24px on a fine pointer, centered on the host', () => {
		expect(matchMedia('(pointer: fine)').matches).toBe(true)

		renderHost(16)

		const { host, box, hostBox } = measure()

		// The host box stays at its own size; only the hit area grows.
		expect(hostBox.width).toBe(16)

		expect(box.width).toBe(24)

		expect(box.height).toBe(24)

		expect(centerOf(box)).toEqual(centerOf(hostBox))

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

	/**
	 * Two hosts under the floor, in a row or a stack that states its gap to
	 * `TouchTarget` on that axis.
	 */
	const renderPair = (axis: 'x' | 'y', gap: number) =>
		renderUI(
			<div
				style={
					{
						display: 'flex',
						flexDirection: axis === 'x' ? 'row' : 'column',
						alignItems: 'flex-start',
						gap,
						padding: '64px',
						[`--touch-target-gap-${axis}`]: `${gap}px`,
					} as CSSProperties
				}
			>
				{['First', 'Second'].map((name) => (
					<button
						key={name}
						type="button"
						aria-label={name}
						style={{ position: 'relative', width: 16, height: 16, padding: 0, border: 0 }}
					>
						<TouchTarget>
							<span />
						</TouchTarget>
					</button>
				))}
			</div>,
		)

	it('keeps the hit areas of two adjacent hosts to their boxes when the row states no gap', () => {
		renderPair('x', 0)

		const first = measure('First')

		const second = measure('Second')

		// Each width stays at its host, and each height keeps the floor.
		expect(first.box.width).toBe(16)

		expect(second.box.width).toBe(16)

		expect(first.box.height).toBe(24)

		expect(second.box.height).toBe(24)

		// Each side of the shared edge goes to the host on that side.
		const y = first.hostBox.top + 8

		expect(hitsHost(first.host, first.hostBox.right - 1, y)).toBe(true)

		expect(hitsHost(second.host, second.hostBox.left + 1, y)).toBe(true)

		// The cap holds on the outer sides too, so the two targets stay equal.
		expect(hitsHost(first.host, first.hostBox.left - 2, y)).toBe(false)

		expect(hitsHost(second.host, second.hostBox.right + 2, y)).toBe(false)

		// Above the box, inside the floor, the host still takes the point.
		expect(hitsHost(first.host, first.hostBox.left + 8, first.hostBox.top - 3)).toBe(true)
	})

	it('splits the gap between two adjacent hosts at its midpoint', () => {
		renderPair('x', 6)

		const first = measure('First')

		const second = measure('Second')

		// 16px and half of the 6px gap on each side is 22px, under the 24px floor.
		expect(first.box.width).toBe(22)

		expect(second.box.width).toBe(22)

		// The two hit areas meet at the midpoint of the gap and do not overlap.
		expect(first.box.right).toBe(second.box.left)

		const y = first.hostBox.top + 8

		const midpoint = first.hostBox.right + 3

		expect(hitsHost(first.host, midpoint - 1, y)).toBe(true)

		expect(hitsHost(second.host, midpoint + 1, y)).toBe(true)
	})

	it('splits the gap between two stacked hosts at its midpoint, and keeps the width', () => {
		renderPair('y', 6)

		const first = measure('First')

		const second = measure('Second')

		// The stack caps the height, and the width keeps the 24px floor.
		expect(first.box.height).toBe(22)

		expect(second.box.height).toBe(22)

		expect(first.box.width).toBe(24)

		// The two hit areas meet at the midpoint of the gap and do not overlap.
		expect(first.box.bottom).toBe(second.box.top)

		const x = first.hostBox.left + 8

		const midpoint = first.hostBox.bottom + 3

		expect(hitsHost(first.host, x, midpoint - 1)).toBe(true)

		expect(hitsHost(second.host, x, midpoint + 1)).toBe(true)
	})
})
