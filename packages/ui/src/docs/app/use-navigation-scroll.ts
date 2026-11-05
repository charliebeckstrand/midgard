import { useLayoutEffect, useRef } from 'react'
import { NavigationType, useLocation, useNavigationType } from 'react-router'
import { focusAnchor } from '../kit/pending-anchor.ts'

/**
 * Scrolls the box of the docs (`SCROLLER` in `root.tsx`). A load of a page,
 * also a reload, starts at the top or at the element of its hash. A navigation
 * in the app to a new page starts at the top, and a tab of the same page keeps
 * the scroll. A hash scrolls to its element, also on a second link to the same
 * hash, because each navigation gives a new location. The ids of the docs are
 * ASCII, so the hash is the id.
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

	// The browser restores the scroll of the window, not of the box, so a load
	// starts at the top. On a reload, Chromium restores the scroll and does not
	// go to the hash, so the box scrolls to the element of the hash at hydration.
	useLayoutEffect(() => {
		document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
	}, [])

	useLayoutEffect(() => {
		if (last.current.location === location) return

		const newPage = last.current.page !== page

		last.current = { location, page }

		const target = location.hash && document.getElementById(location.hash.slice(1))

		if (target) {
			target.scrollIntoView()

			if (navigationType !== NavigationType.Pop) focusAnchor(target)
		} else if (newPage) scroller.current?.scrollTo(0, 0)
	}, [location, navigationType, page])

	return scroller
}
