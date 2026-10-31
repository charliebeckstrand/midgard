import { useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { resolveOffset } from '../../hooks/use-scroll-within.ts'
import { InlineScript } from '../../primitives/inline-script/inline-script.tsx'
import { BREAKPOINT_WIDTHS, SIZE_CLASSES } from '../../types/responsive.ts'

// The scroll of the docs. A load of a page, also a reload, starts at the top or
// at the element of its hash, with the current item of each list in view at
// the first paint (`ScrollRestorationScript`). A navigation in the app then
// scrolls the window (`useNavigationScroll`).
//
// The script runs at the end of the document, and the first paint waits for
// it only where a list that it scrolls shows (`FirstPaintLink`). The content
// comes before the sidebar in the document (`SidebarLayout`), and a phone does
// not show the sidebar. Thus a phone paints a page with no tabs from the first
// parts of the document that the network gives. Until the new page paints,
// Chrome on iOS shows the old page higher, under its toolbar.

/** The id of {@link ScrollRestorationScript}. */
const SCRIPT_ID = 'scroll-restoration'

/** The media query of the widths where the sidebar is in the page. */
const INLINE_SIDEBAR = `(width >= ${BREAKPOINT_WIDTHS[SIZE_CLASSES.expanded]})`

/**
 * Turns off the scroll restoration of the browser, scrolls the window to the
 * element of the hash, and scrolls each list that scrolls on its own to its
 * current item. `resolve` is the rule of the hooks that keep the item in view
 * after hydration (`useNavItem`, `useTabListScroll`), so the item moves by the
 * least distance that shows all of it, and the hooks then find it in view.
 *
 * The page runs the source of this function, so it uses nothing from outside
 * its body.
 */
function restoreScroll(resolve: typeof resolveOffset) {
	history.scrollRestoration = 'manual'

	// With the restoration off, the browser does not scroll a reload to its hash.
	document.getElementById(location.hash.slice(1))?.scrollIntoView()

	// The current item of each list, the scroller of the list, and the names of
	// the measures of its axis.
	const lists = [
		{
			item: '[data-slot="sidebar-item"]:has(> [data-slot="sidebar-item-inner"][data-current])',
			scroller: '[data-slot="sidebar-body"]',
			axis: {
				start: 'top',
				size: 'height',
				view: 'clientHeight',
				border: 'clientTop',
				scroll: 'scrollTop',
			},
		},
		{
			item: '[data-slot="tab"][data-current]',
			scroller: '[data-slot="tab-list-scroll"]',
			axis: {
				start: 'left',
				size: 'width',
				view: 'clientWidth',
				border: 'clientLeft',
				scroll: 'scrollLeft',
			},
		},
	] as const

	for (const { item, scroller, axis } of lists) {
		for (const node of document.querySelectorAll(item)) {
			const box = node.closest(scroller)

			if (!box) continue

			const rect = node.getBoundingClientRect()

			// The offset of the item from the padding box of the scroller.
			const offset = rect[axis.start] - box.getBoundingClientRect()[axis.start] - box[axis.border]

			const position = resolve('nearest', offset, rect[axis.size], box[axis.view], box[axis.scroll])

			if (position !== undefined) box.scrollTo({ [axis.start]: position, behavior: 'instant' })
		}
	}
}

/** The source of the script. */
const SCRIPT = `(${restoreScroll})(${resolveOffset})`

/**
 * The link that holds the first paint until {@link ScrollRestorationScript}
 * has run. Render it in the `<head>`. A page with tabs waits at each width, so
 * its row of tabs paints at the current tab. A page with no tabs waits only at
 * the widths where the sidebar is in the page.
 *
 * The wait does not stop at the row of tabs. A script there reads the layout
 * while the parser is in the page, and in WebKit the first paint of a long
 * page then comes later than at the end of the document.
 *
 * @param tabs - Whether the page has tabs.
 */
export function FirstPaintLink({ tabs }: { tabs: boolean }) {
	return (
		<link
			rel="expect"
			href={`#${SCRIPT_ID}`}
			blocking="render"
			media={tabs ? undefined : INLINE_SIDEBAR}
		/>
	)
}

/** The script of {@link restoreScroll}. Render it at the end of the `<body>`. */
export function ScrollRestorationScript() {
	return <InlineScript id={SCRIPT_ID} source={SCRIPT} />
}

/**
 * Scrolls the window on each navigation in the app. A new page starts at the
 * top, and a tab of the same page keeps the scroll. A hash scrolls to its
 * element, also on a second link to the same hash, because each navigation
 * gives a new location. The ids of the docs are ASCII, so the hash is the id.
 *
 * The load is not a navigation: the browser and `ScrollRestorationScript`
 * scroll it, so the hook does not scroll again at hydration.
 *
 * @param page - The path of the page, the same for each of its tabs.
 */
export function useNavigationScroll(page: string) {
	const location = useLocation()

	// The location and the page that the window scrolled for last. They start
	// as the location and the page of the load.
	const last = useRef({ location, page })

	useLayoutEffect(() => {
		if (last.current.location === location) return

		const newPage = last.current.page !== page

		last.current = { location, page }

		const target = location.hash && document.getElementById(location.hash.slice(1))

		if (target) target.scrollIntoView()
		else if (newPage) window.scrollTo(0, 0)
	}, [location, page])
}
