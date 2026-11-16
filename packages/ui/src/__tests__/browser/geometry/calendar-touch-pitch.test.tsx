import { describe, expect, it, onTestFinished } from 'vitest'
import { Calendar, CalendarRange, CalendarSkeleton } from '../../../components/calendar'
import { scale } from '../../../recipes/kata/calendar'
import { Box } from '../../../structure/box'
import { getSlot, present, renderUI, userEvent } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'
import { overlappingHitAreas } from './helpers/geometry-invariants'

/**
 * The days of a calendar touch, so the hit areas cannot grow past them. On iOS,
 * a finger hit the next day of a 39px grid. On a coarse pointer, each day fills
 * a square cell of 40, 44, or 48 px at `sm`, `md`, and `lg`, so the cells step
 * as the density does. The hit area of each day keeps to the day, so the hit
 * areas tile the grid.
 *
 * This suite cannot match `pointer: coarse` (see
 * `touch-target-geometry.test.tsx`). Each coarse case therefore copies each
 * `(pointer: coarse)` rule of the page out of its media query, into the same
 * cascade layer. The real CSS of the build then lays out the coarse page under
 * a fine pointer.
 */

/** The media text of a coarse pointer. */
const COARSE = /\(pointer:\s*coarse\)/

/** The coarse floor of `TouchTarget` and of the touch pitch, in px. */
const FLOOR = 44

/** The side of a cell on a coarse pointer at each step of a calendar, in px. */
const CELL = { sm: 40, md: 44, lg: 48 } as const

/** The text of each `(pointer: coarse)` rule in `rules`, in its cascade layer. */
function coarseRules(rules: CSSRuleList, layer: string[]): string[] {
	return [...rules].flatMap((rule) => {
		if (rule instanceof CSSLayerBlockRule) return coarseRules(rule.cssRules, [...layer, rule.name])

		if (!(rule instanceof CSSMediaRule)) return []

		if (!COARSE.test(rule.conditionText)) return coarseRules(rule.cssRules, layer)

		const body = [...rule.cssRules].map((inner) => inner.cssText).join('\n')

		return [layer.length ? `@layer ${layer.join('.')} {\n${body}\n}` : body]
	})
}

/** Applies each `(pointer: coarse)` rule of the page until the case ends. */
function coarsePointer() {
	const text = [...document.styleSheets].flatMap((sheet) => coarseRules(sheet.cssRules, []))

	const style = document.createElement('style')

	style.textContent = text.join('\n')

	document.head.append(style)

	onTestFinished(() => style.remove())

	return text.length
}

/** A month that spans six weeks, the tallest month a calendar draws. */
const MONTH = new Date(2026, 4, 15)

/** Each option of the first listbox in `root`. */
function options(root: HTMLElement) {
	return [...present(root.querySelector('[role="listbox"]'), 'the listbox').children].filter(
		(child): child is HTMLElement => child.getAttribute('role') === 'option',
	)
}

/** The box of an option joined with the box of its hit area. */
function hitArea(option: HTMLElement) {
	const box = option.getBoundingClientRect()

	const span = present(option.querySelector('[data-slot="touch-target"]'), 'the hit area')

	const area = span.getBoundingClientRect()

	return {
		width: Math.max(box.right, area.right) - Math.min(box.left, area.left),
		height: Math.max(box.bottom, area.bottom) - Math.min(box.top, area.top),
	}
}

/** The width of a column and the height of a row of the listbox of `root`. */
function cell(root: HTMLElement, columns: number, rows: number) {
	const box = present(root.querySelector('[role="listbox"]'), 'the listbox').getBoundingClientRect()

	return { width: box.width / columns, height: box.height / rows }
}

describe('the touch pitch of Calendar', () => {
	it('finds the coarse rules of the page', () => {
		expect(coarsePointer()).toBeGreaterThan(0)
	})

	it.each(scale)('gives each day a square cell of its step at %s', (size) => {
		coarsePointer()

		const { container } = renderUI(<Calendar size={size} defaultValue={MONTH} />)

		const days = options(container)

		expect(days).toHaveLength(31)

		const { width, height } = cell(container, 7, 6)

		expect(width).toBeNear(CELL[size], HALF_PIXEL)

		expect(height).toBeNear(CELL[size], HALF_PIXEL)

		for (const day of days) {
			const box = day.getBoundingClientRect()

			const area = hitArea(day)

			expect(box.width).toBeNear(width, HALF_PIXEL)

			expect(box.height).toBeNear(height, HALF_PIXEL)

			expect(area.width).toBeNear(width, HALF_PIXEL)

			expect(area.height).toBeNear(height, HALF_PIXEL)
		}

		expect(overlappingHitAreas(container)).toEqual([])
	})

	it.each([
		['xs', 'sm'],
		['xl', 'lg'],
	] as const)('renders at the inner step in an %s scope', (outer, inner) => {
		const nested = getSlot(
			renderUI(
				<Box density={outer}>
					<Calendar defaultValue={MONTH} />
				</Box>,
			).container,
			'calendar',
		)

		const own = getSlot(
			renderUI(<Calendar size={inner} defaultValue={MONTH} />).container,
			'calendar',
		)

		expect(nested.getAttribute('data-density')).toBe(inner)

		const a = nested.getBoundingClientRect()

		const b = own.getBoundingClientRect()

		expect([a.width, a.height]).toEqual([b.width, b.height])
	})

	it('fills each column with the days of a range band', () => {
		coarsePointer()

		const { container } = renderUI(
			<CalendarRange
				size="sm"
				rangeStart={new Date(2026, 4, 11)}
				rangeEnd={new Date(2026, 4, 14)}
			/>,
		)

		const { width } = cell(container, 7, 6)

		const dates = ['2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14']

		const band = options(container).filter((day) => dates.includes(day.dataset.date ?? ''))

		expect(band).toHaveLength(4)

		for (const day of band) expect(day.getBoundingClientRect().width).toBeNear(width, HALF_PIXEL)
	})

	it('gives each month of the picker a cell of at least 44px', async () => {
		coarsePointer()

		const { container } = renderUI(<Calendar size="sm" defaultValue={MONTH} />)

		// The month button of the header opens the picker in a popover.
		const trigger = getSlot(container, 'calendar').querySelector('button:not([aria-label])')

		await userEvent.click(present(trigger, 'the month button'))

		const dialog = present(document.querySelector('[role="dialog"]'), 'the picker popover')

		const months = options(dialog)

		expect(months).toHaveLength(12)

		for (const month of months) {
			const area = hitArea(month)

			expect(area.width).toBeGreaterThanOrEqual(FLOOR - 0.5)

			expect(area.height).toBeGreaterThanOrEqual(FLOOR - 0.5)
		}

		expect(overlappingHitAreas(dialog)).toEqual([])
	})

	it.each(scale)('keeps the skeleton the box of the calendar at %s', (size) => {
		coarsePointer()

		const real = getSlot(
			renderUI(<Calendar size={size} defaultValue={MONTH} />).container,
			'calendar',
		)

		const skeleton = present(
			renderUI(<CalendarSkeleton size={size} />).container.firstElementChild,
			'the skeleton',
		)

		const a = real.getBoundingClientRect()

		const b = skeleton.getBoundingClientRect()

		expect([b.width, b.height]).toEqual([a.width, a.height])
	})

	it('keeps the skeleton the box of the calendar in an xs scope', () => {
		const real = getSlot(
			renderUI(
				<Box density="xs">
					<Calendar defaultValue={MONTH} />
				</Box>,
			).container,
			'calendar',
		)

		const skeleton = present(
			renderUI(
				<Box density="xs">
					<CalendarSkeleton />
				</Box>,
			).container.firstElementChild?.firstElementChild,
			'the skeleton',
		)

		const a = real.getBoundingClientRect()

		const b = skeleton.getBoundingClientRect()

		expect([b.width, b.height]).toEqual([a.width, a.height])
	})

	it('keeps the size of each day on a fine pointer', () => {
		const [day] = options(renderUI(<Calendar size="md" defaultValue={MONTH} />).container)

		expect(present(day, 'a day').getBoundingClientRect().width).toBeLessThan(FLOOR - 0.5)
	})
})
