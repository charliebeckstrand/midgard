import { type PointerEvent, type RefObject, useEffect, useRef, useState } from 'react'
import { dataAttr } from 'ui/core'
import { useTimeout } from 'ui/hooks'
import { useDragCursorHold } from '../../hooks/use-drag-cursor.ts'
import { clamp } from '../../utilities/clamp.ts'
import { createPressOwner } from '../../utilities/primary-press.ts'
import type { PageLink } from '../plugin/pages.ts'

// The letter rail at the side of the sidebar body. A press on a letter scrolls
// the body to the first page with that letter, and a slide along the rail
// follows the finger from letter to letter. The rail shows the letter of the
// page at the top of the body, and mutes the other letters.

/** The letter that a page files under: the first character of its name, in upper case. */
export function getInitial(page: PageLink): string {
	return page.name.charAt(0).toUpperCase()
}

/** The letters that start one or more pages, in alphabetical order. */
export function getLetters(pages: readonly PageLink[]): string[] {
	return [...new Set(pages.map(getInitial))].sort((a, b) => a.localeCompare(b))
}

/**
 * The index of the letter under `y`. The rail divides its height into one
 * equal band for each letter, with no gap between two bands, so each point
 * selects exactly one letter. A point above the rail selects the first letter,
 * and a point below it selects the last letter.
 */
export function bandAt(y: number, top: number, height: number, count: number): number {
	return clamp(Math.floor(((y - top) / height) * count), 0, count - 1)
}

/** The page links in `body`, in the order of the sidebar, which is also the order of their position. */
const getLinks = (body: HTMLElement) => body.querySelectorAll<HTMLElement>('[data-letter]')

/**
 * The element that a jump to `link` brings to the top of the body: the item
 * of the link, or the section of the item when the item is the first in its
 * section, so that the heading of the section comes with the first page.
 */
function getAnchor(link: Element): Element | undefined {
	const item = link.closest('[data-slot="sidebar-item"]')

	if (!item) return undefined

	const section = item.closest('[data-slot="sidebar-section"]')

	return section?.querySelector('[data-slot="sidebar-item"]') === item ? section : item
}

/**
 * Scrolls `body` so that the first page with `letter` is at its top. The first
 * match in the order of the document is the first link of the letter in the
 * sidebar. A page name is a word of the code (`plugin/pages.ts`), so the letter
 * needs no escape in the selector.
 */
function scrollToLetter(body: HTMLElement, letter: string) {
	const link = body.querySelector(`[data-letter="${letter}"]`)

	const anchor = link && getAnchor(link)

	if (!anchor) return

	body.scrollTop += anchor.getBoundingClientRect().top - body.getBoundingClientRect().top
}

/** The letter of the page at the top of `body`: the first page whose row is at least half in view. */
function letterAtTop(body: HTMLElement): string | undefined {
	const top = body.getBoundingClientRect().top

	const link = Array.from(getLinks(body)).find((candidate) => {
		const row = candidate.getBoundingClientRect()

		return row.bottom - top > row.height / 2
	})

	return link?.dataset.letter
}

/**
 * How long a touch stays on the rail before the bubble shows, in milliseconds.
 * A tap ends sooner, so a tap does not flash the bubble.
 */
export const HOLD_DELAY = 250

/** One gesture on the rail: the measure of the rail, and the letter that the gesture selected last. */
type Gesture = {
	top: number
	height: number
	letter?: string
}

/**
 * The letter rail. Each page link in `bodyRef` carries `data-letter`, which
 * {@link getInitial} gives.
 *
 * The rail is for a pointer only. A keyboard and a screen reader get to a page
 * with the search and the arrow keys of the sidebar, so the rail is hidden from
 * the accessibility tree and its letters are not in the Tab order.
 */
export function LetterRail({
	pages,
	bodyRef,
}: {
	pages: readonly PageLink[]
	bodyRef: RefObject<HTMLDivElement | null>
}) {
	const letters = getLetters(pages)

	const [active, setActive] = useState<string | undefined>(undefined)

	// A touch covers the letter under the finger, so a slide by touch shows the
	// letter in a bubble at the side of the rail. The bubble shows when the slide
	// gets to a second letter, or when the touch stays for `HOLD_DELAY`.
	const [bubble, setBubble] = useState(false)

	// The timer of a touch that shows the bubble. It clears on the unmount, so a
	// gesture that the unmount interrupts does not show the bubble later.
	const hold = useTimeout()

	const gesture = useRef<Gesture | undefined>(undefined)

	// The scroll position that the last jump gave the body. The letter of the
	// jump stays active while the body stays there, because the body cannot
	// bring a page near its end to the top. A scroll to another position clears it.
	const rest = useRef<number | undefined>(undefined)

	const cursor = useDragCursorHold('pointer')

	// The pointer of the gesture. While a pen drags, the touch of a palm is a primary
	// press too, and it does not start, move, or end the gesture.
	const [press] = useState(createPressOwner)

	useEffect(() => {
		const body = bodyRef.current

		if (!body) return

		const follow = () => {
			if (rest.current === body.scrollTop) return

			rest.current = undefined

			setActive(letterAtTop(body))
		}

		follow()

		body.addEventListener('scroll', follow, { passive: true })

		return () => body.removeEventListener('scroll', follow)
	}, [bodyRef])

	const select = (y: number) => {
		const body = bodyRef.current

		const current = gesture.current

		if (!body || !current) return

		const letter = letters[bandAt(y, current.top, current.height, letters.length)]

		if (letter === undefined || letter === current.letter) return

		// A slide to a second letter shows the bubble before the timer does.
		if (current.letter !== undefined && hold.pending()) {
			hold.clear()

			setBubble(true)
		}

		current.letter = letter

		scrollToLetter(body, letter)

		rest.current = body.scrollTop

		setActive(letter)
	}

	const end = (event: PointerEvent<HTMLDivElement>) => {
		if (!press.owns(event)) return

		press.release()

		hold.clear()

		gesture.current = undefined

		cursor.end()

		setBubble(false)
	}

	const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
		if (!press.claim(event)) return

		// The press keeps the focus where it is and starts no text selection.
		event.preventDefault()

		const { top, height } = event.currentTarget.getBoundingClientRect()

		gesture.current = { top, height }

		if (event.pointerType !== 'mouse') hold.set(() => setBubble(true), HOLD_DELAY)

		// The capture keeps the moves of the gesture on the rail when the pointer
		// leaves it, so the gesture ends on the rail too.
		event.currentTarget.setPointerCapture(event.pointerId)

		cursor.start()

		select(event.clientY)
	}

	const index = active === undefined ? -1 : letters.indexOf(active)

	return (
		<div aria-hidden data-slot="letter-rail" className="flex flex-col justify-center">
			<div
				data-slot="letter-rail-track"
				className="relative flex min-h-0 cursor-pointer touch-none select-none flex-col [-webkit-touch-callout:none]"
				onPointerDown={onPointerDown}
				onPointerMove={(event) => {
					if (press.owns(event)) select(event.clientY)
				}}
				onPointerUp={end}
				onPointerCancel={end}
				onLostPointerCapture={end}
			>
				{letters.map((letter) => (
					<span
						key={letter}
						data-active={dataAttr(letter === active)}
						className="flex h-6 min-h-0 w-7 shrink items-center justify-center font-medium text-xs/none text-zinc-400 transition-colors not-data-active:hover:text-zinc-600 data-active:font-semibold data-active:text-zinc-950 motion-reduce:transition-none dark:text-zinc-500 dark:data-active:text-white dark:not-data-active:hover:text-zinc-300"
					>
						{letter}
					</span>
				))}
				<span
					data-slot="letter-rail-bubble"
					data-visible={dataAttr(bubble && index !== -1)}
					// The center of the band of the active letter.
					style={{ top: `${((Math.max(index, 0) + 0.5) / letters.length) * 100}%` }}
					className="pointer-events-none absolute end-full me-8 grid size-12 -translate-y-1/2 scale-75 place-items-center rounded-full bg-zinc-900 font-semibold text-white text-xl opacity-0 shadow-lg transition-[opacity,scale] duration-150 ease-out data-visible:scale-100 data-visible:opacity-100 motion-reduce:transition-none dark:bg-white dark:text-zinc-900"
				>
					{active}
				</span>
			</div>
		</div>
	)
}
