import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Sheet, SheetBody, SheetPanel } from '../../../components/sheet'
import { cn } from '../../../core'
import { SidebarLayout, SidebarLayoutBody } from '../../../layouts'
import { k as pdf } from '../../../recipes/kata/pdf-viewer'
import { frames, getSlot, present, renderUI } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'
import { settledRect } from '../helpers/sample'

/**
 * The sidebar sits on the start edge in both directions.
 *
 * The inline panel always followed the reading direction, because the layout is a flex row.
 * The floating sidebar did not. Its hover strip, its pointer buffer and its sheet were fixed to
 * the left. In a right-to-left page the strip opened a sheet on the far edge from the inline
 * panel. The sheet now takes a `start` side, and the strip and the buffer use logical insets.
 * The PDF page rail had the same fault, and its closed margin is now on the start side too.
 *
 * Rides the real browser because jsdom loads no stylesheet and lays nothing out.
 */

type Direction = 'ltr' | 'rtl'

const DIRECTIONS: Direction[] = ['ltr', 'rtl']

/** The distance from the start edge of the screen to the start edge of `rect`. */
function fromStart(rect: DOMRect, dir: Direction): number {
	return dir === 'rtl' ? window.innerWidth - rect.right : rect.left
}

describe('sidebar layout in RTL (real browser)', () => {
	// The desktop sidebar renders from `lg` up.
	beforeAll(() => page.viewport(1100, 800))

	afterEach(() => {
		document.documentElement.removeAttribute('dir')
	})

	it.each(DIRECTIONS)('docks a start sheet on the start edge (%s)', async (dir) => {
		document.documentElement.dir = dir

		renderUI(
			<Sheet open onOpenChange={() => {}}>
				<SheetPanel side="start" aria-label="Start">
					<SheetBody>Start</SheetBody>
				</SheetPanel>
			</Sheet>,
		)

		const panel = await settledRect(getSlot(document.body, 'sheet'))

		const rect = panel.getBoundingClientRect()

		// The `sm:*-4` float, on the start side.
		expect(fromStart(rect, dir)).toBeNear(16, HALF_PIXEL)

		expect(rect.width).toBeLessThan(window.innerWidth / 2)
	})

	it.each(DIRECTIONS)('docks an end sheet on the end edge (%s)', async (dir) => {
		document.documentElement.dir = dir

		renderUI(
			<Sheet open onOpenChange={() => {}}>
				<SheetPanel side="end" aria-label="End">
					<SheetBody>End</SheetBody>
				</SheetPanel>
			</Sheet>,
		)

		const rect = (await settledRect(getSlot(document.body, 'sheet'))).getBoundingClientRect()

		expect(fromStart(rect, dir) + rect.width).toBeNear(window.innerWidth - 16, HALF_PIXEL)
	})

	it.each(DIRECTIONS)('opens the floating sidebar from the start edge (%s)', async (dir) => {
		document.documentElement.dir = dir

		const { container } = renderUI(
			<SidebarLayout floating sidebar={<nav>Links</nav>}>
				<SidebarLayoutBody>Content</SidebarLayoutBody>
			</SidebarLayout>,
		)

		await frames()

		const layout = present(container.firstElementChild, 'layout')

		const strip = present(
			layout.querySelector<HTMLElement>(':scope > [aria-hidden]'),
			'hover strip',
		)

		expect(fromStart(strip.getBoundingClientRect(), dir)).toBeNear(0, HALF_PIXEL)

		await userEvent.hover(strip)

		const rect = (await settledRect(getSlot(document.body, 'sheet'))).getBoundingClientRect()

		// Flush to the start edge, not floated in from it.
		expect(fromStart(rect, dir)).toBeNear(0, HALF_PIXEL)
	})

	it.each(DIRECTIONS)('hides a closed PDF page rail past the start edge (%s)', async (dir) => {
		document.documentElement.dir = dir

		const { container } = renderUI(
			<div className="flex w-[600px] overflow-hidden">
				<aside className={cn(pdf.sidebar.base, pdf.sidebar.closed)} />
				<main className="flex-1">Page</main>
			</div>,
		)

		await frames()

		const row = present(container.firstElementChild, 'row').getBoundingClientRect()

		const rail = present(container.querySelector('aside'), 'rail').getBoundingClientRect()

		// The rail leaves through the start edge of the row, so none of it shows.
		if (dir === 'rtl') expect(rail.left).toBeGreaterThanOrEqual(row.right - 1)
		else expect(rail.right).toBeLessThanOrEqual(row.left + 1)
	})
})
