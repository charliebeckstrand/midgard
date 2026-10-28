import {
	type CSSProperties,
	type PointerEvent,
	type RefObject,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { dataAttr } from 'ui/core'
import { useTimeout } from 'ui/hooks'
import { useDragCursorHold } from '../../hooks/use-drag-cursor.ts'
import { clamp } from '../../utilities/clamp.ts'
import { createPressOwner } from '../../utilities/primary-press.ts'
import type { PageLink } from '../plugin/pages.ts'

// The letter rail at the side of the sidebar body. A press on a letter scrolls
// the body to the first page with that letter, and a slide along the rail
// follows the finger from letter to letter. The rail shows the letter of the
// last jump that the scroll of the body is at or past, and mutes the other letters.
// On a load and after a navigation, the rail pins the letter of the current page
// until the body scrolls.
//
// Scroll-driven animations show that letter, and no script runs. Thus the first
// paint, also the paint of the server markup, shows the final letter. The anchor
// of each jump has a view timeline, and the sidebar lifts the names of the
// timelines to the box that holds the body and the rail. A letter turns on when
// the anchor of its jump gets to the top of the body, and it turns off when the
// anchor of the next jump does. A third animation on the scroll timeline of the
// body turns on only the last letter at the end of the body. A browser without
// scroll-driven animations runs `letterAtTop` on each scroll instead.

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

/**
 * The first page of each letter, in the order of `pages`, which is the order of
 * the sidebar. A jump to a letter goes to its page.
 */
export function getTargetPages(pages: readonly PageLink[]): PageLink[] {
	const seen = new Set<string>()

	return pages.filter((page) => {
		const letter = getInitial(page)

		if (seen.has(letter)) return false

		seen.add(letter)

		return true
	})
}

/** The name of the view timeline of the anchor of the jump to `letter`. */
export function getTimelineName(letter: string): string {
	return `--letter-${letter.codePointAt(0)}`
}

/** The name of the scroll timeline of the body, which the end rule reads. */
export const BODY_TIMELINE = '--letter-body'

/**
 * The scroll-driven animations of a letter, in this order: on at its own jump,
 * off at the next jump, and the end rule. The custom properties of the letter
 * give the timelines of the first two, and `none` leaves one out. A step at
 * the start of each range flips the state, and the state before the range is
 * the state that the animations before it give. The anchor of a jump is at the
 * top from 1px below the top of the body, so that a jump that lands on a
 * fraction of a pixel counts. The end rule starts 1px before the end, for the
 * same reason. Longhands, because Lightning CSS expands the `animation`
 * shorthand with a duration of `0s`.
 */
const follow = [
	'[animation-name:letter-on,letter-off,letter-end]',
	'[animation-duration:auto]',
	'[animation-timing-function:step-start]',
	'[animation-fill-mode:both]',
	// The third timeline is `BODY_TIMELINE`. Tailwind finds only literal classes.
	'[animation-timeline:var(--letter-on-timeline),var(--letter-off-timeline),--letter-body]',
	'[animation-range:exit_-1px_exit_0%,exit_-1px_exit_0%,calc(100%_-_1px)_100%]',
].join(' ')

/**
 * The state of a letter is the number `--letter-on`, 1 when on and 0 when off.
 * The color and the weight mix the two looks by it, so one number from the
 * animations or from a press sets both. A press pins the letter of the jump:
 * `data-active` turns it on, and the pinned track turns the other letters off.
 * The two rules are important, so they win over the animations.
 */
const look = [
	'[color:color-mix(in_oklab,var(--letter-lit)_calc(var(--letter-on)*100%),var(--letter-idle))]',
	'[font-weight:calc(500_+_var(--letter-on)_*_100)]',
	'[--letter-idle:var(--color-zinc-400)] [--letter-lit:var(--color-zinc-950)]',
	'hover:[--letter-idle:var(--color-zinc-600)]',
	'dark:[--letter-idle:var(--color-zinc-500)] dark:[--letter-lit:var(--color-white)]',
	'dark:hover:[--letter-idle:var(--color-zinc-300)]',
	'data-active:[--letter-on:1]! in-data-pinned:not-data-active:[--letter-on:0]!',
].join(' ')

/** The page links in `body`, in the order of the sidebar, which is also the order of their position. */
const getLinks = (body: HTMLElement) => body.querySelectorAll<HTMLElement>('[data-letter]')

/** The first page link of each letter in `body`, in the order of the sidebar. A jump to a letter goes to its link. */
function getTargets(body: HTMLElement): HTMLElement[] {
	const seen = new Set<string | undefined>()

	return Array.from(getLinks(body)).filter((link) => {
		if (seen.has(link.dataset.letter)) return false

		seen.add(link.dataset.letter)

		return true
	})
}

/**
 * The element that a jump to `link` brings to the top of the body: the item
 * of the link, or the section of the item when the item is the first in its
 * section, so that the heading of the section comes with the first page.
 */
function getAnchor(link: HTMLElement): Element | undefined {
	const item = link.closest('[data-slot="sidebar-item"]')

	if (!item) return undefined

	const section = item.closest('[data-slot="sidebar-section"]')

	return section?.querySelector('[data-slot="sidebar-item"]') === item ? section : item
}

/** Scrolls `body` so that the first page with `letter` is at its top. */
function scrollToLetter(body: HTMLElement, letter: string) {
	const link = getTargets(body).find((candidate) => candidate.dataset.letter === letter)

	const anchor = link && getAnchor(link)

	if (!anchor) return

	body.scrollTop += anchor.getBoundingClientRect().top - body.getBoundingClientRect().top
}

/**
 * The letter of the last jump that the scroll of `body` is at or past. The
 * plugin sorts the pages by section and then by name, so each section starts
 * the alphabet again, and the letter of the page at the top does not move in
 * order along the rail. The targets of the jumps do.
 *
 * A target is at the top when its anchor is less than 1px below the top of the
 * body, as in the animations of the rail. At the end of the body, each target
 * is at the top, because a jump to a target near the end stops there too.
 */
function letterAtTop(body: HTMLElement): string | undefined {
	const targets = getTargets(body)

	const end = body.scrollHeight - body.clientHeight

	if (body.scrollTop >= end - 1) return targets.at(-1)?.dataset.letter

	const top = body.getBoundingClientRect().top

	let letter = targets[0]?.dataset.letter

	for (const link of targets) {
		const anchor = getAnchor(link)?.getBoundingClientRect()

		if (!anchor || anchor.top - top >= 1) break

		letter = link.dataset.letter
	}

	return letter
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
	current,
}: {
	pages: readonly PageLink[]
	bodyRef: RefObject<HTMLDivElement | null>
	/** The letter of the current page. The rail pins it until the body scrolls. */
	current?: string
}) {
	const letters = getLetters(pages)

	const targets = getTargetPages(pages).map(getInitial)

	// The pinned letter: the letter of the current page, or of the last jump,
	// while the body stays where it was. In a browser without scroll-driven
	// animations, a scroll pins the letter at the top. The server knows the
	// current page, so its markup holds the pin of the current page.
	const [active, setActive] = useState(current)

	// A navigation pins the letter of the new page.
	const [pinnedPage, setPinnedPage] = useState(current)

	if (pinnedPage !== current) {
		setPinnedPage(current)

		setActive(current)
	}

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

	// The pin of the current page holds at the scroll that the page gets. The
	// current item scrolls into view in a layout effect of the body, which runs
	// before this one.
	useLayoutEffect(() => {
		if (current !== undefined) rest.current = bodyRef.current?.scrollTop
	}, [current, bodyRef])

	useEffect(() => {
		const body = bodyRef.current

		if (!body) return

		// jsdom has `CSS` with no `supports`.
		const animated = globalThis.CSS?.supports?.('animation-timeline', 'scroll()') ?? false

		const onScroll = () => {
			if (rest.current === body.scrollTop) return

			rest.current = undefined

			setActive(animated ? undefined : letterAtTop(body))
		}

		onScroll()

		body.addEventListener('scroll', onScroll, { passive: true })

		return () => body.removeEventListener('scroll', onScroll)
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
				data-pinned={dataAttr(active !== undefined)}
				className="relative flex min-h-0 cursor-pointer touch-none select-none flex-col [-webkit-touch-callout:none]"
				onPointerDown={onPointerDown}
				onPointerMove={(event) => {
					if (press.owns(event)) select(event.clientY)
				}}
				onPointerUp={end}
				onPointerCancel={end}
				onLostPointerCapture={end}
			>
				{letters.map((letter) => {
					const index = targets.indexOf(letter)

					const next = targets[index + 1]

					const style = {
						// The first jump is at the top before any anchor gets there.
						'--letter-on': index === 0 ? 1 : 0,
						'--letter-on-timeline': index === 0 ? 'none' : getTimelineName(letter),
						'--letter-off-timeline': next === undefined ? 'none' : getTimelineName(next),
						'--letter-end': next === undefined ? 1 : 0,
					} as CSSProperties

					return (
						<span
							key={letter}
							data-active={dataAttr(letter === active)}
							style={style}
							className={`flex h-6 min-h-0 w-7 shrink items-center justify-center text-xs/none transition-colors motion-reduce:transition-none ${look} ${follow}`}
						>
							{letter}
						</span>
					)
				})}
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
