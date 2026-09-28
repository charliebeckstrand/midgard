'use client'

import { useEffect } from 'react'

// The time with no scroll event and no viewport event before the check runs. A
// bounce or a toolbar animation sends events until it stops, so the check reads
// the position at rest.
const SETTLE_MS = 150

/**
 * Holds the page at its top under the pinned {@link SidebarLayout}.
 *
 * @remarks The layout gives the page no height to scroll, but Chrome on iOS can
 * leave the page scrolled by the height of its top bar. The layout viewport then
 * stops at the end of the page, and the visual viewport goes past it. The pinned
 * layout stays with the layout viewport, so the bar covers the navbar, and the
 * body shows below the layout. A reload keeps the offset, and only a switch to
 * another tab and back clears it. So the hook scrolls the page back to its top
 * once the events stop.
 *
 * The hook does not move a page that has a height to scroll, a zoomed page, or
 * a page with the keyboard open. In each of these, the offset is intentional.
 *
 * @internal
 */
export function useSidebarPagePin(): void {
	useEffect(() => {
		const root = document.documentElement

		const viewport = window.visualViewport

		let timer: ReturnType<typeof setTimeout> | undefined

		const settle = () => {
			if (root.scrollHeight > root.clientHeight) return

			// The same test for an open keyboard as `useKeyboardSettled`.
			if (
				viewport &&
				(Math.abs(viewport.scale - 1) > 0.01 || viewport.height < window.innerHeight * 0.85)
			) {
				return
			}

			if (window.scrollY === 0 && (viewport?.offsetTop ?? 0) === 0) return

			window.scrollTo({ top: 0, behavior: 'instant' })
		}

		const schedule = () => {
			clearTimeout(timer)

			timer = setTimeout(settle, SETTLE_MS)
		}

		const controller = new AbortController()

		const { signal } = controller

		window.addEventListener('scroll', schedule, { passive: true, signal })

		window.addEventListener('pageshow', schedule, { signal })

		viewport?.addEventListener('resize', schedule, { signal })

		viewport?.addEventListener('scroll', schedule, { signal })

		// A reload can open the page with the offset already in place, and no event follows.
		schedule()

		return () => {
			controller.abort()

			clearTimeout(timer)
		}
	}, [])
}
