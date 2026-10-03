import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { CodeBlock } from '../../components/code'
import { PdfViewer } from '../../components/pdf-viewer'
import { ScrollArea } from '../../components/scroll-area'
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

describe('ScrollArea viewport', () => {
	function Area({ height }: { height: number }) {
		return (
			<ScrollArea aria-label="Log" className="h-24">
				<div style={{ height }}>content</div>
			</ScrollArea>
		)
	}

	function viewport(): HTMLElement {
		return present(
			document.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]'),
			'the scroll area viewport',
		)
	}

	it('adds no tab stop and no name while the content fits', async () => {
		renderUI(<Area height={20} />)

		await frames()

		expect(viewport().hasAttribute('tabindex')).toBe(false)

		expect(viewport().hasAttribute('role')).toBe(false)

		expect(viewport().hasAttribute('aria-label')).toBe(false)
	})

	it('is a named tab stop while the content overflows', async () => {
		renderUI(<Area height={600} />)

		await waitFor(() => expect(viewport().getAttribute('tabindex')).toBe('0'))

		expect(viewport().getAttribute('role')).toBe('region')

		expect(viewport().getAttribute('aria-label')).toBe('Log')
	})

	it('keeps a consumer tab stop and name', async () => {
		renderUI(
			<ScrollArea tabIndex={-1} role="region" aria-label="Log" className="h-24">
				<div style={{ height: 20 }}>content</div>
			</ScrollArea>,
		)

		await frames()

		expect(viewport().getAttribute('tabindex')).toBe('-1')

		expect(viewport().getAttribute('aria-label')).toBe('Log')
	})
})

describe('CodeBlock scroll container', () => {
	/** The scroll container of the block, once painted. */
	function content(): HTMLElement {
		const block = present(
			document.querySelector<HTMLElement>('[data-slot="code-block"]'),
			'the code block',
		)

		return present(block.firstElementChild as HTMLElement | null, 'the code scroll container')
	}

	it.each([
		['the default name', undefined, 'Code'],
		['its label', 'Install command', 'Install command'],
	])('is a region with %s while a line overflows', async (_name, label, name) => {
		renderUI(
			<div style={{ width: 200 }}>
				<CodeBlock code={'const value = 1; '.repeat(40)} copy={false} label={label} />
			</div>,
		)

		await waitFor(() => expect(content().getAttribute('tabindex')).toBe('0'))

		expect(content().getAttribute('role')).toBe('region')

		expect(content().getAttribute('aria-label')).toBe(name)
	})
})

describe('PdfViewer viewport', () => {
	// A plain 600 by 800 page, so no PDF has to load.
	const page = `data:image/svg+xml,${encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="white"/></svg>',
	)}`

	it('is a region named "Page" while a zoomed page overflows it', async () => {
		renderUI(
			<div style={{ width: 400, height: 600 }}>
				<PdfViewer pages={[{ src: page }]} defaultZoom={3} aria-label="Report" />
			</div>,
		)

		const viewport = await waitFor(() => {
			const node = present(
				document.querySelector<HTMLElement>('[data-slot="pdf-viewer-viewport"]'),
				'the viewport',
			)

			expect(node.getAttribute('tabindex')).toBe('0')

			return node
		})

		expect(viewport.getAttribute('role')).toBe('region')

		expect(viewport.getAttribute('aria-label')).toBe('Page')
	})
})
