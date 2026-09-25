import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { type ScrollWithinOptions, useScrollWithin } from '../../hooks/use-scroll-within'
import { present, renderUI, screen, waitFor } from '../helpers'

/**
 * `scrollWithin` computes an offset and hands it to `scrollTo`. Its unit suite
 * pins that arithmetic against geometry written by hand, with `scrollTo` itself
 * a spy — so it reads the number the hook asked for and stops there. What it
 * cannot say is whether that number puts the node where the caller meant.
 * These cases close the loop: a real scroller, a real scroll, and the node's
 * own box measured against the scroller's afterwards.
 */

/** A scroller that overflows both ways, with the target well inside it. */
function Probe({ options }: { options: ScrollWithinOptions }) {
	const scrollWithin = useScrollWithin()

	const target = useRef<HTMLDivElement>(null)

	return (
		<div>
			{/* Outside the scroller, so clicking it cannot scroll anything itself. */}
			<button type="button" data-testid="go" onClick={() => scrollWithin(target.current, options)}>
				go
			</button>

			<div data-testid="scroller" style={{ height: 100, width: 200, overflow: 'auto' }}>
				<div style={{ height: 300, width: 600 }} />

				<div ref={target} data-testid="target" style={{ height: 40, width: 60, marginLeft: 400 }} />

				<div style={{ height: 500, width: 600 }} />
			</div>
		</div>
	)
}

describe('scrollWithin against a real scroller', () => {
	/** Mounts the probe for one set of options and returns the pieces each case reads. */
	function mounted(options: ScrollWithinOptions) {
		renderUI(<Probe options={options} />)

		return {
			scroller: present(screen.getByTestId('scroller'), 'the scroller'),
			target: present(screen.getByTestId('target'), 'the target'),
			go: () => screen.getByTestId('go').click(),
		}
	}

	it('brings the target top to the scroller top for block start', async () => {
		const { scroller, target, go } = mounted({ block: 'start' })

		go()

		await waitFor(() =>
			expect(target.getBoundingClientRect().top).toBeCloseTo(
				scroller.getBoundingClientRect().top,
				0,
			),
		)
	})

	it('centers the target in the scroller for block center', async () => {
		const { scroller, target, go } = mounted({ block: 'center' })

		go()

		await waitFor(() => {
			const box = target.getBoundingClientRect()

			const view = scroller.getBoundingClientRect()

			expect(box.top + box.height / 2).toBeCloseTo(view.top + view.height / 2, 0)
		})
	})

	it('brings the target bottom to the scroller bottom for block end', async () => {
		const { scroller, target, go } = mounted({ block: 'end' })

		go()

		await waitFor(() =>
			expect(target.getBoundingClientRect().bottom).toBeCloseTo(
				scroller.getBoundingClientRect().bottom,
				0,
			),
		)
	})

	it('leaves an already visible target alone under nearest', async () => {
		const { scroller, target, go } = mounted({ block: 'nearest' })

		// Put the target in view by hand, so `nearest` has nothing to do.
		scroller.scrollTop = 300

		await waitFor(() =>
			expect(target.getBoundingClientRect().top).toBeCloseTo(
				scroller.getBoundingClientRect().top,
				0,
			),
		)

		const settled = scroller.scrollTop

		go()

		await waitFor(() => expect(scroller.scrollTop).toBeCloseTo(settled, 0))
	})

	it('reveals the target on the inline axis when inline is requested', async () => {
		const { scroller, target, go } = mounted({ block: 'start', inline: 'start' })

		expect(scroller.scrollLeft).toBe(0)

		go()

		await waitFor(() =>
			expect(target.getBoundingClientRect().left).toBeCloseTo(
				scroller.getBoundingClientRect().left,
				0,
			),
		)

		expect(scroller.scrollLeft).toBeGreaterThan(0)
	})
})
