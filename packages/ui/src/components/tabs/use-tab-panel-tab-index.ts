'use client'

import { useA11yHasTabbable } from '../../hooks'

/**
 * Tab order for a tabpanel: `0` when the panel has no focusable descendant
 * (the APG tabs pattern), else `undefined`.
 * Biome's `noNoninteractiveTabindex` rejects a literal `tabIndex={0}` on a
 * `div[role="tabpanel"]`; a computed value passes.
 *
 * @param node - The panel element, held as state from a callback ref.
 * @see {@link useA11yHasTabbable}
 */
export function useTabPanelTabIndex(node: HTMLElement | null): 0 | undefined {
	// Defaults to `0` on first paint / SSR, before the probe measures contents.
	return useA11yHasTabbable(node) ? undefined : 0
}
