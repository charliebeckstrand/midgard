import { act, fireEvent, render } from '@testing-library/react'
import { describe, expect, vi } from 'vitest'
import { it, onFakeClock } from '../../__tests__/helpers/fake-clock'
import { stubResizeObserver } from '../../__tests__/helpers/stub-resize-observer'
import { clamp } from '../../utilities/clamp.ts'
import { getLetters, getMarks, HOLD_DELAY, letterAt } from '../app/letter-rail.tsx'
import { DocsSearch } from '../app/search.tsx'
import { DocsSidebar } from '../app/sidebar.tsx'
import type { PageLink } from '../plugin/pages.ts'

// The letter rail of the docs sidebar. Each letter has an equal band of the
// rail, so a press selects exactly one letter, and a slide moves from letter to
// letter. A selection scrolls the body to the first page with the letter. The
// rail shows the letter of the last jump that the scroll of the body is at or past.
// A short rail collapses to some of the letters, with a dot between two of them.

const page = (category: string, name: string): PageLink => ({
	category,
	name,
	path: `/${name.toLowerCase()}`,
	tabs: [],
})

/** The components, the pages of the rail. The letters are A, B, C, E, L, and U. */
const COMPONENTS = [
	page('components', 'Accordion'),
	page('components', 'Alert'),
	page('components', 'Badge'),
	page('components', 'Button'),
	page('components', 'Calendar'),
	page('components', 'Card'),
	page('components', 'Editor'),
	page('components', 'Locale'),
	page('components', 'UI'),
]

/** The pages in the order of the plugin: the components first, then each other section, by name. */
const PAGES = [
	...COMPONENTS,
	page('modules', 'Chart'),
	page('modules', 'Editor'),
	page('modules', 'Form'),
	page('modules', 'Grid'),
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

	Object.defineProperty(body, 'clientHeight', { value: VIEW })

	Object.defineProperty(body, 'scrollHeight', { value: y })

	Object.defineProperty(body, 'scrollTop', {
		get: () => scroll,
		set: (value: number) => {
			scroll = clamp(value, 0, end)
		},
	})
}

function renderSidebar(pages = PAGES) {
	const { container } = render(
		<DocsSearch>
			<DocsSidebar pages={pages} />
		</DocsSearch>,
	)

	const body = container.querySelector<HTMLElement>('[data-slot="sidebar-body"]')

	const rail = container.querySelector<HTMLElement>('[data-slot="letter-rail"]')

	const track = container.querySelector<HTMLElement>('[data-slot="letter-rail-track"]')

	if (!body || !rail || !track) throw new Error('The sidebar did not render its body and its rail.')

	layOut(body)

	// Each mark of the track is a band high, so a collapsed track is shorter.
	Object.defineProperty(track, 'getBoundingClientRect', {
		value: () =>
			DOMRect.fromRect({
				y: TRACK_TOP,
				width: 28,
				height: BAND * track.querySelectorAll(':scope > :not([data-slot])').length,
			}),
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

const tap = (track: HTMLElement, y: number, pointerType?: string) => {
	press(track, y, pointerType)

	release(track)
}

describe('letterAt', () => {
	it('gives each point of a full rail to exactly one band', () => {
		expect(letterAt(100, 100, 120, 5, 5)).toBe(0)
		expect(letterAt(123.9, 100, 120, 5, 5)).toBe(0)
		expect(letterAt(124, 100, 120, 5, 5)).toBe(1)
		expect(letterAt(219.9, 100, 120, 5, 5)).toBe(4)
	})

	it('gives a point past an end to the letter at that end', () => {
		expect(letterAt(0, 100, 120, 5, 5)).toBe(0)
		expect(letterAt(220, 100, 120, 5, 5)).toBe(4)
		expect(letterAt(1000, 100, 120, 5, 9)).toBe(8)
	})

	// Five marks of 24 for nine letters: the letters 0, 4, and 8 have a mark.
	it('gives the center of a letter mark to its letter on a collapsed rail', () => {
		expect(letterAt(12, 0, 120, 5, 9)).toBe(0)
		expect(letterAt(60, 0, 120, 5, 9)).toBe(4)
		expect(letterAt(108, 0, 120, 5, 9)).toBe(8)
	})

	it('gives the points of a collapsed rail to each letter, in order', () => {
		const letters = Array.from({ length: 121 }, (_, y) => letterAt(y, 0, 120, 5, 9))

		expect([...new Set(letters)]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
	})
})

describe('getMarks', () => {
	const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']

	it('gives each letter when each letter fits', () => {
		expect(getMarks(LETTERS, 9)).toEqual(LETTERS)
		expect(getMarks(LETTERS, 20)).toEqual(LETTERS)
	})

	it('gives the first letter, the last letter, and a dot between two letters when the letters do not fit', () => {
		expect(getMarks(LETTERS, 7)).toEqual(['A', undefined, 'D', undefined, 'F', undefined, 'I'])
	})

	it('gives an odd count of marks, so the last mark is a letter', () => {
		expect(getMarks(LETTERS, 6)).toEqual(['A', undefined, 'E', undefined, 'I'])
	})

	it('gives no mark when the fewest marks do not fit', () => {
		expect(getMarks(LETTERS, 4)).toEqual([])
	})
})

describe('getLetters', () => {
	it('gives each letter that starts a page once, in alphabetical order', () => {
		expect(getLetters(COMPONENTS)).toEqual(['A', 'B', 'C', 'E', 'L', 'U'])
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

	it('shows no letter when the components are above the top', () => {
		const { body, active } = renderSidebar()

		// UI, the last component, is half in view at the top.
		body.scrollTop = HEADING + ITEM * 8 + ITEM / 2 - 1

		fireEvent.scroll(body)

		expect(active()).toBe('U')

		// The modules are at the top. Their pages have no letter, though Chart and Editor start with C and E.
		body.scrollTop = HEADING * 2 + ITEM * 9

		fireEvent.scroll(body)

		expect(active()).toBeUndefined()
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
		const { body, track, active } = renderSidebar(COMPONENTS)

		tap(track, inBand(3))

		// With no section after the components, Editor is near the end, so the body stops at the end of its content.
		expect(body.scrollTop).toBe(HEADING + ITEM * 9 - VIEW)

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

	// While a pen slides, the touch of a palm is a primary press too.
	it('keeps a pen slide from a palm that lands on the rail', () => {
		const { track, active } = renderSidebar()

		press(track, inBand(0), 'pen')

		const palm = { pointerId: 2, pointerType: 'touch', isPrimary: true, button: 0 }

		fireEvent.pointerDown(track, { ...palm, clientY: inBand(4) })

		fireEvent.pointerMove(track, { ...palm, clientY: inBand(3) })

		expect(active()).toBe('A')

		fireEvent.pointerUp(track, { pointerId: 2 })

		fireEvent.pointerMove(track, { clientY: inBand(1), pointerId: 1 })

		expect(active()).toBe('B')

		release(track)
	})

	describe('touch hold', () => {
		// The case decides when the hold of a touch ends.
		onFakeClock()

		it('shows no bubble for a tap', async ({ clock }) => {
			const { track, bubble } = renderSidebar()

			press(track, inBand(1))

			expect(bubble()).toBe(false)

			release(track)

			await clock.advance(HOLD_DELAY)

			expect(bubble()).toBe(false)
		})

		it('shows the bubble when a touch stays on the rail', async ({ clock }) => {
			const { track, bubble } = renderSidebar()

			press(track, inBand(1))

			await clock.advance(HOLD_DELAY - 1)

			expect(bubble()).toBe(false)

			await clock.advance(1)

			expect(bubble()).toBe(true)

			release(track)

			expect(bubble()).toBe(false)
		})

		it('shows the bubble when a touch slides to a second letter', () => {
			const { track, bubble } = renderSidebar()

			press(track, inBand(1, 2))

			// A move in the band of the first letter is not a slide yet.
			fireEvent.pointerMove(track, { clientY: inBand(1, BAND - 2), pointerId: 1 })

			expect(bubble()).toBe(false)

			fireEvent.pointerMove(track, { clientY: inBand(2), pointerId: 1 })

			expect(bubble()).toBe(true)

			release(track)
		})

		it('shows no bubble for a mouse', async ({ clock }) => {
			const { track, bubble } = renderSidebar()

			press(track, inBand(1), 'mouse')

			fireEvent.pointerMove(track, { clientY: inBand(2), pointerId: 1 })

			await clock.advance(HOLD_DELAY)

			expect(bubble()).toBe(false)

			release(track)
		})
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

	describe('collapsed', () => {
		// The root font size of jsdom is 16px, so the smallest mark is 14px high.
		/** Gives the rail a height that holds `slots` marks of the smallest height. */
		function collapse(slots: number) {
			const observers = stubResizeObserver()

			const sidebar = renderSidebar()

			const rail = sidebar.track.closest<HTMLElement>('[data-slot="letter-rail"]')

			if (!rail) throw new Error('The track is not in the rail.')

			act(() => {
				for (const observer of observers) {
					const entry = { contentRect: DOMRect.fromRect({ width: 28, height: slots * 14 }) }

					observer.callback([entry as ResizeObserverEntry], observer as unknown as ResizeObserver)
				}
			})

			const marks = () =>
				[...rail.querySelectorAll('[data-slot="letter-rail-track"] > :not([data-slot])')].map(
					(mark) => mark.textContent,
				)

			const letter = () => rail.querySelector('[data-slot="letter-rail-bubble"]')?.textContent

			return { ...sidebar, rail, marks, letter }
		}

		/** The y of the center of the mark at `index`. */
		const atMark = (index: number) => TRACK_TOP + index * BAND + BAND / 2

		it('shows the first letter, the last letter, and a letter between them, with dots', () => {
			const { marks } = collapse(5)

			expect(marks()).toEqual(['A', '•', 'E', '•', 'U'])
		})

		it('shows each letter when each letter fits', () => {
			const { marks } = collapse(6)

			expect(marks()).toEqual(['A', 'B', 'C', 'E', 'L', 'U'])
		})

		it('shows no mark when the fewest marks do not fit', () => {
			const { rail } = collapse(4)

			expect(rail.querySelector('[data-slot="letter-rail-track"]')).toBeNull()
		})

		it('selects the letter of a letter mark, and the letters between two marks', () => {
			const { track, letter } = collapse(5)

			tap(track, atMark(2))

			expect(letter()).toBe('E')

			tap(track, atMark(1))

			expect(letter()).toBe('B')

			tap(track, atMark(3))

			expect(letter()).toBe('L')
		})

		it('gets to each letter in a slide', () => {
			const { track, letter } = collapse(5)

			const seen: (string | null | undefined)[] = []

			press(track, TRACK_TOP)

			for (let y = TRACK_TOP; y < TRACK_TOP + 5 * BAND; y++) {
				fireEvent.pointerMove(track, { clientY: y, pointerId: 1 })

				seen.push(letter())
			}

			release(track)

			expect([...new Set(seen)]).toEqual(['A', 'B', 'C', 'E', 'L', 'U'])
		})

		it('shows the mark nearest to a hidden active letter as active', () => {
			const { body, active } = collapse(5)

			body.scrollTop = 100

			fireEvent.scroll(body)

			// B is hidden, and the dot after A is nearest to it.
			expect(active()).toBe('•')
		})

		describe('mouse', () => {
			onFakeClock()

			it('shows the bubble for a mouse that stays on the rail', async ({ clock }) => {
				const { track, bubble } = collapse(5)

				press(track, atMark(1), 'mouse')

				await clock.advance(HOLD_DELAY)

				expect(bubble()).toBe(true)

				release(track)
			})
		})
	})
})
