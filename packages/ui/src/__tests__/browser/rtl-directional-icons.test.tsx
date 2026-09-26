import { afterEach, describe, expect, it } from 'vitest'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '../../components/breadcrumb'
import { Calendar } from '../../components/calendar'
import { Pagination, PaginationNext, PaginationPrevious } from '../../components/pagination'
import { Tree, TreeItem } from '../../components/tree'
import { getSlot, present, renderUI, screen } from '../helpers'

/**
 * A directional icon points the way its control goes, in both directions.
 *
 * The breadcrumb, pagination, calendar and tree chevrons did not mirror. In a right-to-left
 * document, a "next" chevron then pointed back toward the start, and a closed tree branch
 * pointed away from its children. Each icon now mirrors in RTL. An open tree chevron turns the
 * other way in RTL, so it still points down.
 *
 * The test composes the computed `rotate` and `scale` of each glyph and reads where its arrow
 * points. Rides the real browser because jsdom loads no stylesheet.
 */
describe('directional icons in RTL (real browser)', () => {
	afterEach(() => {
		document.documentElement.removeAttribute('dir')
	})

	/**
	 * Where a glyph points on screen, as a unit vector (y down). `glyph` is the direction the
	 * unstyled glyph points: 1 for a right chevron, -1 for a left one.
	 */
	function pointing(icon: Element, glyph: 1 | -1): { x: number; y: number } {
		const style = getComputedStyle(icon)

		const degrees = style.rotate === 'none' ? 0 : Number.parseFloat(style.rotate)

		const [sx = 1, sy = sx] = style.scale === 'none' ? [] : style.scale.split(' ').map(Number)

		// The individual transform properties apply scale first, then rotate.
		const point = new DOMMatrix().rotate(degrees).scale(sx, sy).transformPoint({ x: glyph, y: 0 })

		return { x: Math.round(point.x), y: Math.round(point.y) }
	}

	const svg = (element: Element | null, what: string) =>
		present(element?.querySelector('svg') ?? null, what)

	for (const dir of ['ltr', 'rtl'] as const) {
		/** The screen direction of the inline end: right in LTR, left in RTL. */
		const end = dir === 'ltr' ? 1 : -1

		describe(dir, () => {
			it('points the breadcrumb separator to the inline end', () => {
				document.documentElement.dir = dir

				const { container } = renderUI(
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>Home</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>Docs</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>,
				)

				const separator = svg(getSlot(container, 'breadcrumb-separator'), 'separator icon')

				expect(pointing(separator, 1)).toEqual({ x: end, y: 0 })
			})

			it('points next to the inline end and previous to the inline start', () => {
				document.documentElement.dir = dir

				renderUI(
					<Pagination>
						<PaginationPrevious href="/1" />
						<PaginationNext href="/3" />
					</Pagination>,
				)

				const next = svg(screen.getByRole('link', { name: 'Next page' }), 'next icon')

				const previous = svg(screen.getByRole('link', { name: 'Previous page' }), 'previous icon')

				expect(pointing(next, 1)).toEqual({ x: end, y: 0 })

				expect(pointing(previous, -1)).toEqual({ x: -end, y: 0 })
			})

			it('points the calendar month steps the same way', () => {
				document.documentElement.dir = dir

				renderUI(<Calendar />)

				const next = svg(screen.getByRole('button', { name: 'Next month' }), 'next month icon')

				const previous = svg(
					screen.getByRole('button', { name: 'Previous month' }),
					'previous month icon',
				)

				expect(pointing(next, 1)).toEqual({ x: end, y: 0 })

				expect(pointing(previous, -1)).toEqual({ x: -end, y: 0 })
			})

			it('points a closed branch to the inline end and an open one down', () => {
				document.documentElement.dir = dir

				renderUI(
					<Tree aria-label="Files">
						<TreeItem label="open" defaultOpen>
							<TreeItem label="a.ts" />
						</TreeItem>
						<TreeItem label="closed">
							<TreeItem label="b.ts" />
						</TreeItem>
					</Tree>,
				)

				const open = svg(screen.getByRole('treeitem', { name: /open/ }), 'open chevron')

				const closed = svg(screen.getByRole('treeitem', { name: /closed/ }), 'closed chevron')

				expect(pointing(closed, 1)).toEqual({ x: end, y: 0 })

				expect(pointing(open, 1)).toEqual({ x: 0, y: 1 })
			})
		})
	}
})
