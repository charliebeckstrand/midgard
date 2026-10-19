import { act, fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { clamp } from '../../utilities/clamp.ts'
import { bandAt, HOLD_DELAY, lettersOf } from '../app/letter-rail.tsx'
import { DocsSearch } from '../app/search.tsx'
import { DocsSidebar } from '../app/sidebar.tsx'
import type { PageLink } from '../plugin/pages.ts'

// The letter rail of the docs sidebar. Each letter has an equal band of the
// rail, so a press selects exactly one letter, and a slide moves from letter to
// letter. A selection scrolls the body to the first page with the letter. The
// rail shows the letter of the pages at the top of the body.

const page = (category: string, name: string): PageLink => ({
	category,
	name,
	path: `/${name.toLowerCase()}`,
	tabs: [],
})

/** The pages in the order of the plugin: by section, then by name. The letters are A, B, C, E, L, and U. */
const PAGES = [
	page('components', 'Accordion'),
	page('components', 'Alert'),
	page('components', 'Badge'),
	page('components', 'Button'),
	page('components', 'Calendar'),
	page('components', 'Card'),
	page('modules', 'Chart'),
	page('modules', 'Editor'),
	page('providers', 'Locale'),
	page('providers', 'UI'),
]

const HEADING = 30

const ITEM = 40

/** The height of the visible part of the body. */
const VIEW = 200

/** The height of the band of each letter. */
const BAND = 24

/** The top of the rail. */
const TRACK_TOP = 100

/**
 * Gives the body a layout that jsdom does not compute: a heading, then one
 * row for each item, in each section. The body scrolls between 0 and the end
 * of its content, as a browser clamps it.
 */
function layOut(body: HTMLElement) {
	let scroll = 0

	let y = 0

	const place = (element: Element, top: number, height: number) => {
		Object.defineProperty(element, 'getBoundingClientRect', {
			value: () => DOMRect.fromRect({ y: top - scroll, width: 200, height }),
		})
	}

	for (const section of body.querySelectorAll('[data-slot="sidebar-section"]')) {
		const items = section.querySelectorAll('[data-slot="sidebar-item"]')

		place(section, y, HEADING + items.length * ITEM)

		y += HEADING

		for (const item of items) {
			place(item, y, ITEM)

			const link = item.querySelector('[data-letter]')

			if (link) place(link, y, ITEM)

			y += ITEM
		}
	}

	const end = y - VIEW

	Object.defineProperty(body, 'getBoundingClientRect', {
		value: () => DOMRect.fromRect({ width: 200, height: VIEW }),
	})

	Object.defineProperty(body, 'scrollTop', {
		get: () => scroll,
		set: (value: number) => {
			scroll = clamp(value, 0, end)
		},
	})
}

function renderSidebar() {
	const { container } = render(
		<DocsSearch>
			<DocsSidebar pages={PAGES} />
		</DocsSearch>,
	)

	const body = container.querySelector<HTMLElement>('[data-slot="sidebar-body"]')

	const rail = container.querySelector<HTMLElement>('[data-slot="letter-rail"]')

	const track = container.querySelector<HTMLElement>('[data-slot="letter-rail-track"]')

	if (!body || !rail || !track) throw new Error('The sidebar did not render its body and its rail.')

	layOut(body)

	Object.defineProperty(track, 'getBoundingClientRect', {
		value: () =>
			DOMRect.fromRect({ y: TRACK_TOP, width: 28, height: BAND * lettersOf(PAGES).length }),
	})

	track.setPointerCapture = vi.fn()

	// The layout comes after the mount, so a scroll makes the rail read it.
	fireEvent.scroll(body)

	const active = () => rail.querySelector('[data-active]')?.textContent

	const bubble = () =>
		rail.querySelector('[data-slot="letter-rail-bubble"]')?.hasAttribute('data-visible')

	return { body, track, active, bubble }
}

/** The y of a point in the band at `index`: `offset` from the top of the band. */
const inBand = (index: number, offset = BAND / 2) => TRACK_TOP + index * BAND + offset

const press = (track: HTMLElement, y: number, pointerType = 'touch') => {
	fireEvent.pointerDown(track, {
		clientY: y,
		button: 0,
		isPrimary: true,
		pointerId: 1,
		pointerType,
	})
}

const release = (track: HTMLElement) => {
	fireEvent.pointerUp(track, { pointerId: 1 })
}

/** Fakes the timers for the case, so the case decides when the hold of a touch ends. */
const fakeTimers = () => {
	vi.useFakeTimers()
}

const tap = (track: HTMLElement, y: number, pointerType?: string) => {
	press(track, y, pointerType)

	release(track)
}

describe('bandAt', () => {
	it('gives each point of the rail to exactly one band', () => {
		expect(bandAt(100, 100, 120, 5)).toBe(0)
		expect(bandAt(123.9, 100, 120, 5)).toBe(0)
		expect(bandAt(124, 100, 120, 5)).toBe(1)
		expect(bandAt(219.9, 100, 120, 5)).toBe(4)
	})

	it('gives a point past an end to the band at that end', () => {
		expect(bandAt(0, 100, 120, 5)).toBe(0)
		expect(bandAt(220, 100, 120, 5)).toBe(4)
		expect(bandAt(1000, 100, 120, 5)).toBe(4)
	})
})

describe('lettersOf', () => {
	it('gives each letter that starts a page once, in alphabetical order', () => {
		expect(lettersOf(PAGES)).toEqual(['A', 'B', 'C', 'E', 'L', 'U'])
	})
})

describe('LetterRail', () => {
	it('shows the letter of the pages at the top of the body', () => {
		const { body, active } = renderSidebar()

		expect(active()).toBe('A')

		// Accordion and Alert are above the top, so Badge is the first page there.
		body.scrollTop = 100

		fireEvent.scroll(body)

		expect(active()).toBe('B')
	})

	it('selects the letter whose band holds the press, at each edge of the band', () => {
		const { track, active } = renderSidebar()

		tap(track, inBand(2, 0))

		expect(active()).toBe('C')

		tap(track, inBand(2, BAND - 0.1))

		expect(active()).toBe('C')

		tap(track, inBand(3, 0))

		expect(active()).toBe('E')
	})

	it('scrolls the first page of the letter to the top of the body', () => {
		const { body, track } = renderSidebar()

		tap(track, inBand(2))

		// Calendar is the first page with C, after a heading and four items.
		expect(body.scrollTop).toBe(HEADING + 4 * ITEM)
	})

	it('brings the heading of a section with the first page of the section', () => {
		const { body, track } = renderSidebar()

		body.scrollTop = 150

		tap(track, inBand(0))

		expect(body.scrollTop).toBe(0)
	})

	it('keeps the letter of a jump that the body cannot bring to the top', () => {
		const { body, track, active } = renderSidebar()

		tap(track, inBand(3))

		// Editor is near the end, so the body stops at the end of its content.
		expect(body.scrollTop).toBe(HEADING * 3 + ITEM * 10 - VIEW)

		fireEvent.scroll(body)

		expect(active()).toBe('E')

		body.scrollTop = 100

		fireEvent.scroll(body)

		expect(active()).toBe('B')
	})

	it('follows a slide from letter to letter, and past an end of the rail', () => {
		const { track, active } = renderSidebar()

		press(track, inBand(0))

		fireEvent.pointerMove(track, { clientY: inBand(1), pointerId: 1 })

		expect(active()).toBe('B')

		fireEvent.pointerMove(track, { clientY: inBand(4), pointerId: 1 })

		expect(active()).toBe('L')

		fireEvent.pointerMove(track, { clientY: TRACK_TOP + 1000, pointerId: 1 })

		expect(active()).toBe('U')

		fireEvent.pointerMove(track, { clientY: 0, pointerId: 1 })

		expect(active()).toBe('A')

		release(track)

		// A move after the release is a hover, not a slide.
		fireEvent.pointerMove(track, { clientY: inBand(2), pointerId: 1 })

		expect(active()).toBe('A')
	})

	it('shows no bubble for a tap', () => {
		fakeTimers()

		const { track, bubble } = renderSidebar()

		press(track, inBand(1))

		expect(bubble()).toBe(false)

		release(track)

		act(() => vi.advanceTimersByTime(HOLD_DELAY))

		expect(bubble()).toBe(false)
	})

	it('shows the bubble when a touch stays on the rail', () => {
		fakeTimers()

		const { track, bubble } = renderSidebar()

		press(track, inBand(1))

		act(() => vi.advanceTimersByTime(HOLD_DELAY - 1))

		expect(bubble()).toBe(false)

		act(() => vi.advanceTimersByTime(1))

		expect(bubble()).toBe(true)

		release(track)

		expect(bubble()).toBe(false)
	})

	it('shows the bubble when a touch slides to a second letter', () => {
		fakeTimers()

		const { track, bubble } = renderSidebar()

		press(track, inBand(1, 2))

		// A move in the band of the first letter is not a slide yet.
		fireEvent.pointerMove(track, { clientY: inBand(1, BAND - 2), pointerId: 1 })

		expect(bubble()).toBe(false)

		fireEvent.pointerMove(track, { clientY: inBand(2), pointerId: 1 })

		expect(bubble()).toBe(true)

		release(track)
	})

	it('shows no bubble for a mouse', () => {
		fakeTimers()

		const { track, bubble } = renderSidebar()

		press(track, inBand(1), 'mouse')

		fireEvent.pointerMove(track, { clientY: inBand(2), pointerId: 1 })

		act(() => vi.advanceTimersByTime(HOLD_DELAY))

		expect(bubble()).toBe(false)

		release(track)
	})

	it('holds the drag cursor through a mouse slide', () => {
		const { track } = renderSidebar()

		const rule = () => document.head.querySelector('style[data-drag-cursor]')?.textContent

		press(track, inBand(1), 'mouse')

		expect(track.setPointerCapture).toHaveBeenCalledWith(1)
		expect(rule()).toContain('cursor:pointer')

		release(track)

		expect(rule()).toBeUndefined()
	})

	it.each([
		['a secondary button', { button: 2 }],
		// The macOS secondary click: the primary button with Ctrl.
		['a Ctrl+primary', { button: 0, ctrlKey: true }],
	])('ignores %s press', (_, init) => {
		const { body, track, active } = renderSidebar()

		fireEvent.pointerDown(track, {
			clientY: inBand(2),
			...init,
			isPrimary: true,
			pointerId: 1,
			pointerType: 'mouse',
		})

		expect(active()).toBe('A')
		expect(body.scrollTop).toBe(0)
	})
})
