'use client'

import { useSyncExternalStore } from 'react'
import { isRtl } from './a11y/logical-arrow'

/**
 * Calls `onChange` when a `dir` attribute changes anywhere in the document.
 * A `dir` change is the only markup change that can move the computed
 * direction.
 */
function subscribe(onChange: () => void) {
	const observer = new MutationObserver(onChange)

	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['dir'],
		subtree: true,
	})

	return () => observer.disconnect()
}

/**
 * Whether `target` lays out right to left. With no `target`, the root element
 * decides. The value updates when a `dir` attribute changes.
 *
 * Use it where the direction must be known before the first paint, such as the
 * `initial` of an animation. A key handler reads the direction at the key
 * press instead, through `logicalArrowKey`.
 *
 * The server and the hydration pass read left to right.
 *
 * @internal
 */
export function useIsRtl(target?: Element | null): boolean {
	return useSyncExternalStore(
		subscribe,
		() => isRtl(target ?? document.documentElement),
		() => false,
	)
}
