import { useEffect, useState } from 'react'

/**
 * Keeps a form disabled from a successful step until the page goes away.
 * Returns `leaving` and `leave`, which sets `leaving` and then runs the
 * navigation that it gets.
 *
 * @internal
 * @remarks
 * A request can resolve before the navigation that follows it paints. Without
 * this latch, the form comes back for that gap, and the user sees it blink.
 * Only the unmount of the page clears the latch. A page that the browser
 * restores from the back-forward cache also clears it, because that page
 * stays mounted.
 */
export function useLeaving(): [leaving: boolean, leave: (go: () => void) => void] {
	const [leaving, setLeaving] = useState(false)

	useEffect(() => {
		function onPageShow(event: PageTransitionEvent) {
			if (event.persisted) setLeaving(false)
		}

		window.addEventListener('pageshow', onPageShow)

		return () => window.removeEventListener('pageshow', onPageShow)
	}, [])

	function leave(go: () => void) {
		setLeaving(true)

		go()
	}

	return [leaving, leave]
}
