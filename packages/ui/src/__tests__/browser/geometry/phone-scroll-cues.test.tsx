import { type ReactElement, useState } from 'react'
import { renderToString } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Label } from '../../../components/fieldset'
import { Input } from '../../../components/input'
import { Timeline, TimelineItem, TimelineTitle } from '../../../components/timeline'
import {
	FormFilters,
	FormFiltersBar,
	FormFiltersField,
	FormFiltersRow,
} from '../../../modules/form'
import { attach, frames, getSlot, renderUI, screen, waitFor } from '../../helpers'
import { nextPaint } from '../../helpers/frames'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/**
 * At a phone width, a `rail` FormFilters row and a horizontal Timeline scroll
 * inside themselves. Each fades the edge that has more content behind it, so
 * the cut does not look like a clip. While it overflows, each is also a tab
 * stop, so a keyboard user can scroll it. The FormFilters row is a region with the
 * name of the bar. The Timeline keeps its `list` role and its own name.
 *
 * jsdom lays nothing out and compiles no Tailwind. Only a real browser proves
 * the overflow, the scroll, and the mask.
 */

const FIELDS = ['Search', 'Status', 'Owner', 'Region', 'Team']

const TITLES = ['Project kicked off', 'Design completed', 'Beta released', 'Launched']

/** A `rail` bar whose field count the case toggles between a fit and an overflow. */
function Rail({
	dir,
	layout = 'rail',
	initial = FIELDS.length,
}: {
	dir?: 'rtl'
	layout?: 'rail' | 'stack'
	initial?: number
}) {
	const [count, setCount] = useState(initial)

	return (
		<div dir={dir}>
			<button
				type="button"
				data-testid="toggle"
				onClick={() => setCount((prev) => (prev > 1 ? 1 : 5))}
			>
				toggle
			</button>

			<FormFilters aria-label="Order filters" layout={layout}>
				<FormFiltersBar>
					<FormFiltersRow>
						{FIELDS.slice(0, count).map((name) => (
							<FormFiltersField key={name} name={name} className="w-48">
								<Label>{name}</Label>
								<Input placeholder={name} />
							</FormFiltersField>
						))}
					</FormFiltersRow>
				</FormFiltersBar>
			</FormFilters>
		</div>
	)
}

/** A horizontal timeline whose item count the case toggles between a fit and an overflow. */
function Line({ dir, initial = TITLES.length }: { dir?: 'rtl'; initial?: number }) {
	const [count, setCount] = useState(initial)

	return (
		<div dir={dir}>
			<button
				type="button"
				data-testid="toggle"
				onClick={() => setCount((prev) => (prev > 1 ? 1 : 4))}
			>
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

/**
 * Puts the server markup of `ui` in the page, with no React root, and returns
 * its host. The browser paints this markup before the client hydrates it, so
 * the first frame shows only what the CSS draws.
 */
function mountServerMarkup(ui: ReactElement): HTMLElement {
	const host = attach(document.createElement('div'))

	host.innerHTML = renderToString(ui)

	return host
}

/** The width of a full edge fade, 1.5rem at the root font size of the suite. */
const FULL_FADE_PX = 24

/** The part of the mask width past 100%, in pixels, as `calc(100% ± Npx)` or `100%`. */
const MASK_WIDTH = /^(?:calc\(100% ([+-]) ([\d.]+)px\)|100%)/

/**
 * The physical sides that the drawn mask fades. The mask image has a full
 * fade at each end, and the mask extends past each side by the part of that
 * fade that does not show (`core/scroll/fade.ts`). Thus a side fades when the
 * mask extends past it by less than a full fade.
 */
function fadedSides(el: HTMLElement): { left: boolean; right: boolean } {
	const style = getComputedStyle(el)

	if (style.maskImage === 'none') return { left: false, right: false }

	const x = Number.parseFloat(style.maskPosition)

	const match = MASK_WIDTH.exec(style.maskSize)

	if (!match) throw new Error(`Unexpected mask size: ${style.maskSize}`)

	const extra = match[1] ? Number(`${match[1]}${match[2]}`) : 0

	return { left: -x < FULL_FADE_PX, right: x + extra < FULL_FADE_PX }
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
		{ name: 'FormFilters rail row', Subject: Rail, slot: 'form-filters-row' },
		{ name: 'horizontal Timeline', Subject: Line, slot: 'timeline' },
	])('$name', ({ Subject, slot }) => {
		it('fades the end edge on attach, both edges mid-travel, and the start edge at the end', async () => {
			const { container } = renderUI(<Subject />)

			const el = getSlot(container, slot)

			expect(el.scrollWidth).toBeGreaterThan(el.clientWidth)

			await waitFor(() => expect(fadedSides(el)).toEqual({ left: false, right: true }))

			scrollToMiddle(el)

			await waitFor(() => expect(fadedSides(el)).toEqual({ left: true, right: true }))

			scrollToEnd(el)

			await waitFor(() => expect(fadedSides(el)).toEqual({ left: true, right: false }))
		})

		it('fades the physical left edge as the end in a right-to-left document', async () => {
			const { container } = renderUI(<Subject dir="rtl" />)

			const el = getSlot(container, slot)

			await waitFor(() => expect(fadedSides(el)).toEqual({ left: true, right: false }))

			scrollToEnd(el, true)

			await waitFor(() => expect(fadedSides(el)).toEqual({ left: false, right: true }))
		})

		it('fades the end edge in the first paint of the server markup', async () => {
			const el = getSlot(mountServerMarkup(<Subject />), slot)

			await nextPaint()

			expect(fadedSides(el)).toEqual({ left: false, right: true })
		})

		it('fades the physical left edge in the first paint of right-to-left server markup', async () => {
			const el = getSlot(mountServerMarkup(<Subject dir="rtl" />), slot)

			await nextPaint()

			expect(fadedSides(el)).toEqual({ left: true, right: false })
		})

		it('puts no mask on server markup that fits', async () => {
			const el = getSlot(mountServerMarkup(<Subject initial={1} />), slot)

			await nextPaint()

			expect(el.scrollWidth).toBe(el.clientWidth)

			expect(getComputedStyle(el).maskImage).toBe('none')
		})

		it('drops the fade when the content fits', async () => {
			const { container } = renderUI(<Subject />)

			const el = getSlot(container, slot)

			await waitFor(() => expect(fadedSides(el)).toEqual({ left: false, right: true }))

			screen.getByTestId('toggle').click()

			await waitFor(() => expect(fadedSides(el)).toEqual({ left: false, right: false }))
		})
	})

	describe('FormFilters rail row as a scroll region', () => {
		it('is a named region and a tab stop only while it overflows', async () => {
			const { container } = renderUI(<Rail />)

			const row = getSlot(container, 'form-filters-row')

			await waitFor(() => expect(row.getAttribute('tabindex')).toBe('0'))

			expect(screen.getByRole('region', { name: 'Order filters' })).toBe(row)

			screen.getByTestId('toggle').click()

			await waitFor(() => expect(row.hasAttribute('tabindex')).toBe(false))

			expect(row.hasAttribute('role')).toBe(false)

			expect(row.hasAttribute('aria-label')).toBe(false)

			expect(screen.queryByRole('region')).toBeNull()
		})

		it('scrolls a field that the fade covers clear of the fade on focus', async () => {
			const { container } = renderUI(<Rail />)

			const row = getSlot(container, 'form-filters-row')

			await waitFor(() => expect(fadedSides(row)).toEqual({ left: false, right: true }))

			const input = screen.getByPlaceholderText('Status')

			input.focus()

			await frames()

			expect(row.scrollLeft).toBeGreaterThan(0)

			expect(row.getBoundingClientRect().right - input.getBoundingClientRect().right).toBeNear(
				FULL_FADE_PX,
				HALF_PIXEL,
			)
		})

		it('adds nothing to a stack row', async () => {
			const { container } = renderUI(<Rail layout="stack" />)

			const row = getSlot(container, 'form-filters-row')

			await frames()

			expect(row.hasAttribute('tabindex')).toBe(false)

			expect(row.hasAttribute('role')).toBe(false)

			expect(getComputedStyle(row).maskImage).toBe('none')
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

			expect(getComputedStyle(root).maskImage).toBe('none')
		})
	})
})
