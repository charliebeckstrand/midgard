import { useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router'

/**
 * Scrolls the window of the docs. A load of a page, also a reload, starts at
 * the top or at the element of its hash. A navigation in the app to a new page
 * starts at the top, and a tab of the same page keeps the scroll. A hash
 * scrolls to its element, also on a second link to the same hash, because each
 * navigation gives a new location. The ids of the docs are ASCII, so the hash
 * is the id.
 *
 * The sidebar keeps its current item in view on its own (`SidebarItem`).
 * The row of tabs paints at its start (`useTabListScroll`).
 *
 * @param page - The path of the page, the same for each of its tabs.
 */
export function useNavigationScroll(page: string) {
	const location = useLocation()

	// The location and the page that the window scrolled for last. They start
	// as the location and the page of the load.
	const last = useRef({ location, page })

	// The browser keeps the mode of the entry, so a reload starts at the top.
	// In that mode, Chromium does not scroll a reload to its hash.
	useLayoutEffect(() => {
		history.scrollRestoration = 'manual'

		document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
	}, [])

	useLayoutEffect(() => {
		if (last.current.location === location) return

		const newPage = last.current.page !== page

		last.current = { location, page }

		const target = location.hash && document.getElementById(location.hash.slice(1))

		if (target) target.scrollIntoView()
		else if (newPage) window.scrollTo(0, 0)
	}, [location, page])
}
