import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { freezeStyleTree, KEEP_ALL } from '../../../core/rasterize-element'
import { attach, present, renderUI } from '../../helpers'
import { PIXEL } from '../../helpers/geometry/tolerance'

/**
 * The synchronous half of `rasterizeElement`: the style-frozen clone that the
 * bitmap draws. The async half decodes an image, which this suite does not
 * drive (CONVENTIONS §10.3). Where each box sits in the clone is a layout
 * claim, so it runs in the browser.
 */
beforeAll(() => page.viewport(960, 800))

const ROWS = Array.from({ length: 10 }, (_, index) => `Row ${index + 1}`)

/** Renders a box of 200px that scrolls a column of rows of 50px, scrolls it by `scrollTop`, and gives the root. */
function renderScrolled(scrollTop: number): HTMLElement {
	const { container } = renderUI(
		<div data-testid="root" style={{ width: 300, background: 'white' }}>
			<header style={{ height: 40 }}>Header</header>

			<div data-testid="scroller" style={{ height: 200, overflowY: 'auto' }}>
				<div data-testid="moved" style={{ height: 20, translate: '12px 3px' }}>
					Moved
				</div>

				{ROWS.map((row) => (
					<div key={row} data-row={row} style={{ height: 50 }}>
						{row}
					</div>
				))}

				<div data-testid="fixed" style={{ position: 'fixed', left: 0, top: 0, width: 10 }}>
					Fixed
				</div>
			</div>
		</div>,
	)

	present(container.querySelector<HTMLElement>('[data-testid="scroller"]'), 'scroller').scrollTop =
		scrollTop

	return present(container.querySelector<HTMLElement>('[data-testid="root"]'), 'root')
}

/** Freezes a clone of `root`, and lays it out on the page at the origin, so a case can read where its boxes sit. */
function frozenClone(root: HTMLElement): HTMLElement {
	const clone = root.cloneNode(true) as HTMLElement

	freezeStyleTree(root, clone, getComputedStyle(root), KEEP_ALL)

	clone.style.margin = '0'

	const host = attach(document.createElement('div'))

	host.style.cssText = 'position: fixed; left: 0; top: 0;'

	host.append(clone)

	return clone
}

/** The top of the element of `selector` in `root`, relative to the border box of `root`. */
function top(root: HTMLElement, selector: string): number {
	const element = present(root.querySelector(selector), selector)

	return element.getBoundingClientRect().top - root.getBoundingClientRect().top
}

/** The left of the element of `selector` in `root`, relative to the border box of `root`. */
function left(root: HTMLElement, selector: string): number {
	const element = present(root.querySelector(selector), selector)

	return element.getBoundingClientRect().left - root.getBoundingClientRect().left
}

describe('rasterizeElement capture (real browser)', () => {
	it('shows a scrolled box at its scroll offset', () => {
		const root = renderScrolled(120)

		const clone = frozenClone(root)

		for (const row of ['Row 3', 'Row 4', 'Row 6']) {
			const selector = `[data-row="${row}"]`

			expect(top(clone, selector)).toBeNear(top(root, selector), PIXEL)
		}

		// Row 3 starts 120px down the column, under the header of 40px, and the
		// column scrolled up by 120px.
		expect(top(clone, '[data-row="Row 3"]')).toBeNear(40 + 120 - 120, PIXEL)
	})

	it('adds the scroll offset to the translate of a box', () => {
		const root = renderScrolled(30)

		const clone = frozenClone(root)

		// The box keeps its own translate of 12px 3px, and moves up by the scroll.
		expect(left(clone, '[data-testid="moved"]')).toBeNear(12, PIXEL)

		expect(top(clone, '[data-testid="moved"]')).toBeNear(40 + 3 - 30, PIXEL)

		expect(top(clone, '[data-testid="moved"]')).toBeNear(top(root, '[data-testid="moved"]'), PIXEL)
	})

	it('does not move a fixed child of a scrolled box', () => {
		const root = renderScrolled(120)

		const clone = frozenClone(root)

		const fixed = present(
			clone.querySelector<HTMLElement>('[data-testid="fixed"]'),
			'fixed',
		).style.getPropertyValue('translate')

		expect(fixed).not.toContain('-120px')
	})

	it('draws a shadow ring as an outline, which WebKit on iOS draws in place', () => {
		const { container } = renderUI(
			<div data-testid="root" style={{ width: 200, padding: 10 }}>
				<div
					data-testid="ring"
					style={{ height: 40, borderRadius: 8, boxShadow: 'inset 0 0 0 1px rgb(245, 158, 11)' }}
				/>
			</div>,
		)

		const clone = frozenClone(
			present(container.querySelector<HTMLElement>('[data-testid="root"]'), 'root'),
		)

		const ring = getComputedStyle(present(clone.querySelector('[data-testid="ring"]'), 'ring'))

		expect(ring.boxShadow).toBe('none')

		expect(ring.outlineStyle).toBe('solid')

		expect(ring.outlineWidth).toBe('1px')

		expect(ring.outlineColor).toBe('rgb(245, 158, 11)')

		expect(ring.outlineOffset).toBe('-1px')
	})
})
