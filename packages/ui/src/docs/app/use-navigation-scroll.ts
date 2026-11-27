import { useEffect, useLayoutEffect, useRef } from 'react'
import { type Location, NavigationType, useLocation, useNavigationType } from 'react-router'
import { focusAnchor } from '../kit/pending-anchor.ts'

/**
 * Scrolls the box of the docs (`SCROLLER` in `root.tsx`). A load of a page,
 * also a reload, starts at the top or at the element of its hash. A navigation
 * in the app to a new page starts at the top, and a tab of the same page keeps
 * the scroll. A hash scrolls to its element, also on a second link to the same
 * hash, because each navigation gives a new location. The ids of the docs are
 * ASCII, so the hash is the id. A move back or forward through the history
 * goes to the scroll that the box had at that entry of the history, also for
 * an entry with a hash and for an entry of the same page. The browser keeps
 * the scroll of the window only, not of the box. An entry that the shell did
 * not show since the load, as after a reload, goes to the element of its hash
 * or, for a new page, to the top.
 *
 * A link or a pick in the search to a hash also moves the focus to its element
 * ({@link focusAnchor}), so the next Tab starts there. The palette gives the
 * focus back to its opener, and without this move, the next Tab scrolls the
 * box back to the opener. A load and a move through the history keep the
 * focus.
 *
 * The sidebar keeps its current item in view on its own (`SidebarItem`).
 * The row of tabs paints at its start (`useTabListScroll`).
 *
 * @param page - The path of the page, the same for each of its tabs.
 * @returns The ref of the box that scrolls.
 */
export function useNavigationScroll(page: string) {
	const location = useLocation()

	const navigationType = useNavigationType()

	const scroller = useRef<HTMLDivElement>(null)

	// The location and the page that the box scrolled for last. They start
	// as the location and the page of the load.
	const last = useRef({ location, page })

	// The scroll of the box at each entry of the history, by the key of its
	// location. The layout effect of a navigation writes the scroll that the
	// entry starts at, so an entry that the reader does not scroll, such as a
	// tab that keeps the scroll, also has its scroll. Each scroll of the box
	// then writes the scroll of the location that the box shows. A scroll event
	// comes after the commit and the layout effect of a navigation, so the
	// scroll of the old entry stays as it was before the navigation, and each
	// scroll after it goes to the new location.
	const positions = useRef(new Map<string, number>())

	useEffect(() => {
		const box = scroller.current

		if (!box) return

		const save = () => positions.current.set(last.current.location.key, box.scrollTop)

		box.addEventListener('scroll', save, { passive: true })

		return () => box.removeEventListener('scroll', save)
	}, [])

	// The browser restores the scroll of the window, not of the box, so a load
	// starts at the top. On a reload, Chromium restores the scroll and does not
	// go to the hash, so the box scrolls to the element of the hash at hydration.
	useLayoutEffect(() => {
		document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
	}, [])

	useLayoutEffect(() => {
		const box = scroller.current

		if (!box) return

		if (last.current.location !== location) {
			const newPage = last.current.page !== page

			last.current = { location, page }

			scrollForNavigation(box, location, navigationType, newPage, positions.current)
		}

		positions.current.set(location.key, box.scrollTop)
	}, [location, navigationType, page])

	return scroller
}

/**
 * Scrolls the box for a navigation to `location`. A move through the history
 * goes to the scroll of its entry first. Else the box goes to the element of
 * the hash, and a link or a pick in the search also moves the focus to it.
 * Else a new page starts at the top.
 */
function scrollForNavigation(
	box: HTMLElement,
	location: Location,
	navigationType: NavigationType,
	newPage: boolean,
	positions: ReadonlyMap<string, number>,
) {
	const pop = navigationType === NavigationType.Pop

	const saved = pop ? positions.get(location.key) : undefined

	if (saved !== undefined) {
		box.scrollTo(0, saved)

		return
	}

	const target = location.hash && document.getElementById(location.hash.slice(1))

	if (target) {
		target.scrollIntoView()

		if (!pop) focusAnchor(target)
	} else if (newPage) box.scrollTo(0, 0)
}
