'use client'

import { type RefObject, useEffect, useState } from 'react'

// Tab-focusable descendants: anything in the tab order. Excludes
// `tabindex="-1"` and `disabled` controls.
const FOCUSABLE_SELECTOR =
	'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Tab order for a tabpanel: `0` when the panel has no focusable descendant
 * (the APG tabs pattern), else `undefined`.
 * Biome's `noNoninteractiveTabindex` rejects a literal `tabIndex={0}` on a
 * `div[role="tabpanel"]`; a computed value passes.
 */
export function useTabPanelTabIndex(ref: RefObject<HTMLElement | null>): 0 | undefined {
	// Defaults to `0` on first paint / SSR, before the effect measures contents.
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
