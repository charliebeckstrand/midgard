import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Table, TableBody, TableCell, TableRow } from '../../components/table'
import { useScrollRegion } from '../../hooks/use-scroll-region'
import { frames, present, renderUI, screen, waitFor } from '../helpers'

/**
 * {@link useScrollRegion} makes a scroller a tab stop only while its content
 * overflows. The decision is a comparison of the scroll size with the client
 * size, which jsdom reports as zero, so the cases run against real layout.
 *
 * Firefox and Chromium focus an overflowing scroller without help, and Safari
 * does not. The attributes, not the engine, are what these cases read.
 */

/** A fixed-width scroller whose content width the case controls. */
function Probe({ label }: { label?: string }) {
	const attach = useScrollRegion({ label })

	const [wide, setWide] = useState(false)

	return (
		<div>
			<button type="button" data-testid="toggle" onClick={() => setWide((value) => !value)}>
				toggle
			</button>

			<div ref={attach} data-testid="scroller" style={{ width: 200, overflowX: 'auto' }}>
				<div style={{ width: wide ? 600 : 100, height: 20 }} />
			</div>
		</div>
	)
}

/** The scroller node, once painted. */
function scroller(): HTMLElement {
	return present(screen.getByTestId('scroller'), 'the scroller')
}

describe('useScrollRegion against a real scroller', () => {
	it('adds no tab stop while the content fits', async () => {
		renderUI(<Probe />)

		await frames()

		expect(scroller().hasAttribute('tabindex')).toBe(false)
	})

	it('adds the tab stop while the content overflows, and removes it on a fit', async () => {
		renderUI(<Probe />)

		await frames()

		screen.getByTestId('toggle').click()

		await waitFor(() => expect(scroller().getAttribute('tabindex')).toBe('0'))

		// No name, so no landmark.
		expect(scroller().hasAttribute('role')).toBe(false)

		screen.getByTestId('toggle').click()

		await waitFor(() => expect(scroller().hasAttribute('tabindex')).toBe(false))
	})

	it('names the region only while it overflows', async () => {
		renderUI(<Probe label="Orders" />)

		await frames()

		expect(scroller().hasAttribute('role')).toBe(false)

		expect(scroller().hasAttribute('aria-label')).toBe(false)

		screen.getByTestId('toggle').click()

		await waitFor(() => expect(scroller().getAttribute('role')).toBe('region'))

		expect(scroller().getAttribute('aria-label')).toBe('Orders')

		screen.getByTestId('toggle').click()

		await waitFor(() => expect(scroller().hasAttribute('role')).toBe(false))

		expect(scroller().hasAttribute('aria-label')).toBe(false)
	})
})

describe('useScrollRegion on a box that does not scroll', () => {
	function Visible() {
		const attach = useScrollRegion()

		return (
			<div ref={attach} data-testid="scroller" style={{ width: 200, overflow: 'visible' }}>
				<div style={{ width: 600, height: 20 }} />
			</div>
		)
	}

	it('adds no tab stop when the overflow is visible', async () => {
		renderUI(<Visible />)

		await frames()

		// The content passes the edge, but the box does not scroll.
		expect(scroller().scrollWidth).toBeGreaterThan(scroller().clientWidth)

		expect(scroller().hasAttribute('tabindex')).toBe(false)
	})
})

describe('Table scroll container', () => {
	function Wide({ width }: { width: number }) {
		return (
			<div style={{ width }}>
				<Table tableProps={{ 'aria-label': 'Activity' }}>
					<TableBody>
						<TableRow>
							<TableCell>
								<div style={{ width: 600 }}>wide cell</div>
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</div>
		)
	}

	function container(): HTMLElement {
		return present(
			document.querySelector<HTMLElement>('[data-slot="table"]'),
			'the table scroll container',
		)
	}

	it('is a named tab stop while the table overflows', async () => {
		renderUI(<Wide width={300} />)

		await waitFor(() => expect(container().getAttribute('tabindex')).toBe('0'))

		expect(container().getAttribute('role')).toBe('region')

		expect(container().getAttribute('aria-label')).toBe('Activity')
	})

	it('adds no tab stop while the table fits', async () => {
		renderUI(<Wide width={900} />)

		await frames()

		expect(container().hasAttribute('tabindex')).toBe(false)

		expect(container().hasAttribute('role')).toBe(false)
	})
})
