import { type PointerEvent, type RefObject, useEffect, useRef, useState } from 'react'
import { dataAttr } from 'ui/core'
import { useDragCursorHold } from '../../hooks/use-drag-cursor.ts'
import { clamp } from '../../utilities/clamp.ts'
import type { PageLink } from '../plugin/pages.ts'

// The letter rail at the side of the sidebar body. A press on a letter scrolls
// the body to the first page with that letter, and a slide along the rail
// follows the finger from letter to letter. The rail shows the letter of the
// pages at the top of the body, and mutes the other letters.

/** The letter that a page files under: the first character of its name, in upper case. */
export function initialOf(page: PageLink): string {
	return page.name.charAt(0).toUpperCase()
}

/** The letters that start one or more pages, in alphabetical order. */
export function lettersOf(pages: readonly PageLink[]): string[] {
	return [...new Set(pages.map(initialOf))].sort((a, b) => a.localeCompare(b))
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
const linksOf = (body: HTMLElement) => body.querySelectorAll<HTMLElement>('[data-letter]')

/**
 * Scrolls `body` so that the first page with `letter` is at its top. The
 * first page of a section brings the heading of the section with it.
 */
function scrollToLetter(body: HTMLElement, letter: string) {
	const link = Array.from(linksOf(body)).find((candidate) => candidate.dataset.letter === letter)

	const item = link?.closest('[data-slot="sidebar-item"]')

	if (!item) return

	const section = item.closest('[data-slot="sidebar-section"]')

	const anchor = section?.querySelector('[data-slot="sidebar-item"]') === item ? section : item

	body.scrollTop += anchor.getBoundingClientRect().top - body.getBoundingClientRect().top
}

/** The letter of the first page whose center is below the top of `body`, which a binary search finds. */
function letterAtTop(body: HTMLElement): string | undefined {
	const links = linksOf(body)

	const top = body.getBoundingClientRect().top

	let low = 0

	let high = links.length - 1

	while (low < high) {
		const middle = (low + high) >> 1

		const rect = links.item(middle).getBoundingClientRect()

		if (rect.top + rect.height / 2 < top) low = middle + 1
		else high = middle
	}

	return links[low]?.dataset.letter
}

/** The measure of the rail for one gesture, and the letter that the gesture selected last. */
type Gesture = { top: number; height: number; letter?: string }

/**
 * The letter rail. Each page link in `bodyRef` carries `data-letter`, which
 * {@link initialOf} gives.
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
	const letters = lettersOf(pages)

	const [active, setActive] = useState<string | undefined>(undefined)

	// A touch covers the letter under the finger, so a slide by touch shows the
	// letter in a bubble at the side of the rail.
	const [bubble, setBubble] = useState(false)

	const gesture = useRef<Gesture | undefined>(undefined)

	// The scroll position that the last jump gave the body. The letter of the
	// jump stays active while the body stays there, because the body cannot
	// bring a page near its end to the top. A scroll to another position clears it.
	const rest = useRef<number | undefined>(undefined)

	const cursor = useDragCursorHold('pointer')

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

		current.letter = letter

		scrollToLetter(body, letter)

		rest.current = body.scrollTop

		setActive(letter)
	}

	const end = () => {
		gesture.current = undefined

		cursor.end()

		setBubble(false)
	}

	const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
		if (!event.isPrimary || event.button !== 0) return

		// The press keeps the focus where it is and starts no text selection.
		event.preventDefault()

		const { top, height } = event.currentTarget.getBoundingClientRect()

		gesture.current = { top, height }

		// The capture keeps the moves of the gesture on the rail when the pointer
		// leaves it, so the gesture ends on the rail too.
		event.currentTarget.setPointerCapture(event.pointerId)

		cursor.start()

		setBubble(event.pointerType !== 'mouse')

		select(event.clientY)
	}

	const index = active === undefined ? -1 : letters.indexOf(active)

	return (
		<div aria-hidden data-slot="letter-rail" className="flex flex-col justify-center">
			<div
				data-slot="letter-rail-track"
				className="relative flex min-h-0 cursor-pointer touch-none select-none flex-col [-webkit-touch-callout:none]"
				onPointerDown={onPointerDown}
				onPointerMove={(event) => select(event.clientY)}
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
