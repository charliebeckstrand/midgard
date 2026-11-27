import { describe, expect, it } from 'vitest'
import { Calendar, CalendarSkeleton } from '../../../components/calendar'
import { Box } from '../../../structure/box'
import { getSlot, present, renderUI } from '../../helpers'

/**
 * The days of a calendar on a fine pointer, and in a density scope. The page has
 * a mouse. `coarse/calendar-touch-pitch.test.tsx` holds the touch pitch of the
 * days on a coarse pointer.
 */

/** The coarse floor of `TouchTarget` and of the touch pitch, in px. */
const FLOOR = 44

/** A month that spans six weeks, the tallest month a calendar draws. */
const MONTH = new Date(2026, 4, 15)

/** Each option of the first listbox in `root`. */
function options(root: HTMLElement) {
	return [...present(root.querySelector('[role="listbox"]'), 'the listbox').children].filter(
		(child): child is HTMLElement => child.getAttribute('role') === 'option',
	)
}

describe('the days of Calendar on a fine pointer and in a scope', () => {
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
