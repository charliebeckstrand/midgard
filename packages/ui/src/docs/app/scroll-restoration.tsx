import { useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { InlineScript } from '../../primitives/inline-script/inline-script.tsx'

// The scroll of the docs. A load of a page, also a reload, starts at the top,
// with the current item of each list in view at the first paint
// (`ScrollRestorationScript`). A navigation in the app then scrolls the window
// (`useNavigationScroll`).

/**
 * Turns off the scroll restoration of the browser, and scrolls each list that
 * scrolls on its own to its current item. The item moves by the least distance
 * that shows all of it, as the 'nearest' rule of `scrollNodeWithin` does. The
 * hooks that keep the item in view after hydration (`useNavItem`,
 * `useTabListScroll`) then find it in view, and do not scroll again.
 *
 * The page runs the source of this function, so it uses nothing from outside
 * its body.
 */
function restoreScroll() {
	history.scrollRestoration = 'manual'

	// The names of the measures of each axis.
	const y = { start: 'top', size: 'height', view: 'clientHeight', border: 'clientTop' } as const

	const x = { start: 'left', size: 'width', view: 'clientWidth', border: 'clientLeft' } as const

	// The marker of the current item, the node that the hook keeps in view, the
	// scroller of the list, and its axis.
	const lists = [
		{
			current: '[data-slot="sidebar-item-inner"][data-current]',
			node: '[data-slot="sidebar-item"]',
			scroller: '[data-slot="sidebar-body"]',
			axis: y,
		},
		{
			current: '[data-slot="tab"][data-current]',
			node: '[data-slot="tab"]',
			scroller: '[data-slot="tab-list-scroll"]',
			axis: x,
		},
	]

	for (const { current, node, scroller, axis } of lists) {
		for (const marker of document.querySelectorAll(current)) {
			const item = marker.closest(node)

			const box = item?.closest(scroller)

			if (!item || !box) continue

			const itemRect = item.getBoundingClientRect()

			// The offset of the item from the padding box of the scroller, and the
			// room that the scroller has around the item.
			const offset =
				itemRect[axis.start] - box.getBoundingClientRect()[axis.start] - box[axis.border]

			const slack = box[axis.view] - itemRect[axis.size]

			const delta = offset < 0 ? offset : Math.max(offset - slack, 0)

			box.scrollBy({ [axis.start]: delta, behavior: 'instant' })
		}
	}
}

/**
 * The inline script of {@link restoreScroll}. Render it in the `<head>`. It is
 * a module, so it runs when the parser has read the whole document, and it
 * blocks the render, so the first paint waits for it. The page thus paints
 * whole, with the current item of each list in view.
 */
export function ScrollRestorationScript() {
	return <InlineScript type="module" blocking="render" source={`(${restoreScroll})()`} />
}

/**
 * Scrolls the window on each navigation in the app. A new page starts at the
 * top, and a tab of the same page keeps the scroll. A hash scrolls to its
 * element, also on a second link to the same hash, because each navigation
 * gives a new location. The ids of the docs are ASCII, so the hash is the id.
 *
 * @param page - The path of the page, the same for each of its tabs.
 */
export function useNavigationScroll(page: string) {
	const location = useLocation()

	// The page that the window scrolled for last.
	const scrolled = useRef<string>(undefined)

	useLayoutEffect(() => {
		const target = location.hash && document.getElementById(location.hash.slice(1))

		if (target) target.scrollIntoView()
		else if (scrolled.current !== page) window.scrollTo(0, 0)

		scrolled.current = page
	}, [location, page])
}
