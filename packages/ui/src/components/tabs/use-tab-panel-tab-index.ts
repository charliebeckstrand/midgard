'use client'

import { type RefObject, useEffect, useState } from 'react'

// Tab-focusable descendants — anything already in the tab order. `tabindex="-1"`
// and `disabled` controls are excluded since they can't be tabbed to.
const FOCUSABLE_SELECTOR =
	'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Tab order for a tabpanel: `0` when it has no focusable descendant (so an
 * otherwise-unreachable panel is keyboard-reachable), else `undefined` (the
 * panel is reached through its own focusable content — no redundant stop). Per
 * the APG tabs pattern. Being a computed value, it also satisfies Biome's
 * `noNoninteractiveTabindex`, which rejects a literal `tabIndex={0}` on the
 * tabpanel's `div` (no native element carries the role).
 */
export function useTabPanelTabIndex(ref: RefObject<HTMLElement | null>): 0 | undefined {
	// Default focusable so the panel is reachable on the first paint / under SSR,
	// before the effect can measure its contents.
	const [tabIndex, setTabIndex] = useState<0 | undefined>(0)

	useEffect(() => {
		const el = ref.current

		if (!el) return

		const update = () => {
			setTabIndex(el.querySelector(FOCUSABLE_SELECTOR) ? undefined : 0)
		}

		update()

		const observer = new MutationObserver(update)

		observer.observe(el, { childList: true, subtree: true, attributes: true })

		return () => observer.disconnect()
	}, [ref])

	return tabIndex
}
