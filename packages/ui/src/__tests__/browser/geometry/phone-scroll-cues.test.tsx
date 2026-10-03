import { useState } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Label } from '../../../components/fieldset'
import { Filters, FiltersBar, FiltersField, FiltersRow } from '../../../components/filters'
import { Input } from '../../../components/input'
import { Timeline, TimelineItem, TimelineTitle } from '../../../components/timeline'
import { frames, getSlot, renderUI, screen, waitFor } from '../../helpers'

/**
 * At a phone width, a `rail` Filters row and a horizontal Timeline scroll
 * inside themselves. Each fades the edge that has more content behind it, so
 * the cut does not look like a clip. While it overflows, each is also a tab
 * stop, so a keyboard user can scroll it. The Filters row is a region with the
 * name of the bar. The Timeline keeps its `list` role and its own name.
 *
 * jsdom lays nothing out and compiles no Tailwind. Only a real browser proves
 * the overflow, the scroll, and the mask that the attributes open.
 */

const FIELDS = ['Search', 'Status', 'Owner', 'Region', 'Team']

const TITLES = ['Project kicked off', 'Design completed', 'Beta released', 'Launched']

/** A `rail` bar whose field count the case toggles between a fit and an overflow. */
function Rail({ dir, layout = 'rail' }: { dir?: 'rtl'; layout?: 'rail' | 'stack' }) {
	const [count, setCount] = useState(FIELDS.length)

	return (
		<div dir={dir}>
			<button type="button" data-testid="toggle" onClick={() => setCount((n) => (n > 1 ? 1 : 5))}>
				toggle
			</button>

			<Filters aria-label="Order filters" layout={layout}>
				<FiltersBar>
					<FiltersRow>
						{FIELDS.slice(0, count).map((name) => (
							<FiltersField key={name} name={name} className="w-48">
								<Label>{name}</Label>
								<Input placeholder={name} />
							</FiltersField>
						))}
					</FiltersRow>
				</FiltersBar>
			</Filters>
		</div>
	)
}

/** A horizontal timeline whose item count the case toggles between a fit and an overflow. */
function Line({ dir }: { dir?: 'rtl' }) {
	const [count, setCount] = useState(TITLES.length)

	return (
		<div dir={dir}>
			<button type="button" data-testid="toggle" onClick={() => setCount((n) => (n > 1 ? 1 : 4))}>
				toggle
			</button>

			<Timeline orientation="horizontal" aria-label="Release history">
				{TITLES.slice(0, count).map((title) => (
					<TimelineItem key={title}>
						<TimelineTitle>{title}</TimelineTitle>
					</TimelineItem>
				))}
			</Timeline>
		</div>
	)
}

/** `[start, end]` as the hook currently has them stamped. */
function edges(el: HTMLElement): [boolean, boolean] {
	return [el.hasAttribute('data-overflow-start'), el.hasAttribute('data-overflow-end')]
}

/**
 * The physical sides that the mask fades, read from the computed mask. An edge
 * that does not fade keeps the opaque gradient of Tailwind, which has no
 * direction keyword.
 */
function fadedSides(el: HTMLElement): { left: boolean; right: boolean } {
	const mask = getComputedStyle(el).maskImage

	return { left: mask.includes('to left'), right: mask.includes('to right') }
}

/** Scrolls `el` to the end of its reading direction. */
function scrollToEnd(el: HTMLElement, rtl = false) {
	el.scrollLeft = rtl ? -el.scrollWidth : el.scrollWidth
}

/** Scrolls `el` to the middle of its travel. */
function scrollToMiddle(el: HTMLElement, rtl = false) {
	const middle = (el.scrollWidth - el.clientWidth) / 2

	el.scrollLeft = rtl ? -middle : middle
}

describe('phone scroll cues (real browser, 375px)', () => {
	beforeAll(() => page.viewport(375, 700))

	describe.each([
		{ name: 'Filters rail row', Subject: Rail, slot: 'filters-row' },
		{ name: 'horizontal Timeline', Subject: Line, slot: 'timeline' },
	])('$name', ({ Subject, slot }) => {
		it('fades the end edge on attach, both edges mid-travel, and the start edge at the end', async () => {
			const { container } = renderUI(<Subject />)

			const el = getSlot(container, slot)

			expect(el.scrollWidth).toBeGreaterThan(el.clientWidth)

			await waitFor(() => expect(edges(el)).toEqual([false, true]))

			expect(fadedSides(el)).toEqual({ left: false, right: true })

			scrollToMiddle(el)

			await waitFor(() => expect(edges(el)).toEqual([true, true]))

			expect(fadedSides(el)).toEqual({ left: true, right: true })

			scrollToEnd(el)

			await waitFor(() => expect(edges(el)).toEqual([true, false]))

			expect(fadedSides(el)).toEqual({ left: true, right: false })
		})

		it('fades the physical left edge as the end in a right-to-left document', async () => {
			const { container } = renderUI(<Subject dir="rtl" />)

			const el = getSlot(container, slot)

			await waitFor(() => expect(edges(el)).toEqual([false, true]))

			expect(fadedSides(el)).toEqual({ left: true, right: false })

			scrollToEnd(el, true)

			await waitFor(() => expect(edges(el)).toEqual([true, false]))

			expect(fadedSides(el)).toEqual({ left: false, right: true })
		})

		it('drops the fade when the content fits', async () => {
			const { container } = renderUI(<Subject />)

			const el = getSlot(container, slot)

			await waitFor(() => expect(edges(el)).toEqual([false, true]))

			screen.getByTestId('toggle').click()

			await waitFor(() => expect(edges(el)).toEqual([false, false]))

			expect(fadedSides(el)).toEqual({ left: false, right: false })
		})
	})

	describe('Filters rail row as a scroll region', () => {
		it('is a named region and a tab stop only while it overflows', async () => {
			const { container } = renderUI(<Rail />)

			const row = getSlot(container, 'filters-row')

			await waitFor(() => expect(row.getAttribute('tabindex')).toBe('0'))

			expect(screen.getByRole('region', { name: 'Order filters' })).toBe(row)

			screen.getByTestId('toggle').click()

			await waitFor(() => expect(row.hasAttribute('tabindex')).toBe(false))

			expect(row.hasAttribute('role')).toBe(false)

			expect(row.hasAttribute('aria-label')).toBe(false)

			expect(screen.queryByRole('region')).toBeNull()
		})

		it('adds nothing to a stack row', async () => {
			const { container } = renderUI(<Rail layout="stack" />)

			const row = getSlot(container, 'filters-row')

			await frames()

			expect(row.hasAttribute('tabindex')).toBe(false)

			expect(row.hasAttribute('role')).toBe(false)

			expect(edges(row)).toEqual([false, false])
		})
	})

	describe('horizontal Timeline as a scroll region', () => {
		it('is a tab stop only while it overflows, and keeps its list role and name', async () => {
			const { container } = renderUI(<Line />)

			const root = getSlot(container, 'timeline')

			await waitFor(() => expect(root.getAttribute('tabindex')).toBe('0'))

			expect(screen.getByRole('list', { name: 'Release history' })).toBe(root)

			screen.getByTestId('toggle').click()

			await waitFor(() => expect(root.hasAttribute('tabindex')).toBe(false))

			expect(screen.getByRole('list', { name: 'Release history' })).toBe(root)
		})

		it('adds nothing to a vertical timeline', async () => {
			const { container } = renderUI(
				<Timeline aria-label="Release history">
					{TITLES.map((title) => (
						<TimelineItem key={title}>
							<TimelineTitle>{title}</TimelineTitle>
						</TimelineItem>
					))}
				</Timeline>,
			)

			const root = getSlot(container, 'timeline')

			await frames()

			expect(root.hasAttribute('tabindex')).toBe(false)

			expect(edges(root)).toEqual([false, false])
		})
	})
})
