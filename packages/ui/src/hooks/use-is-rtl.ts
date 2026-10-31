'use client'

import { useSyncExternalStore } from 'react'
import { useDirectionScope } from '../primitives/direction'
import { createListenerRegistry } from '../utilities/listener-registry'
import { isRtl } from './a11y/logical-arrow'

/**
 * One `MutationObserver` on the root element for every caller. It watches the
 * `dir` attribute in the whole document, because a `dir` change is the only
 * markup change that can move the computed direction. The registry has one key.
 */
const registry = createListenerRegistry<Element, MutationRecord[]>({
	source: () => document.documentElement,
	attach: (root, _key, listener) => {
		const observer = new MutationObserver(listener)

		observer.observe(root, { attributes: true, attributeFilter: ['dir'], subtree: true })

		return () => observer.disconnect()
	},
})

/** Calls `onChange` when a `dir` attribute changes anywhere in the document. */
function subscribe(onChange: () => void) {
	return registry.subscribe('dir', onChange)
}

/**
 * Whether `element` lays out right to left, from the nearest `dir` attribute:
 * the markup that the observer watches. A read of the attribute does not make
 * the browser compute the style of a page that is still changing. Only `auto`
 * reads the computed style, because the text decides it.
 */
function readRtl(element: Element): boolean {
	for (let node: Element | null = element; node; node = node.parentElement) {
		const dir = node.getAttribute('dir')?.toLowerCase()

		if (dir === 'rtl' || dir === 'ltr') return dir === 'rtl'

		if (dir === 'auto') return isRtl(node)
	}

	return false
}

/**
 * Whether `target` lays out right to left. With no `target`, the nearest
 * direction scope decides, and outside each scope the root element decides.
 * The value updates when a `dir` attribute changes.
 *
 * Use it where the direction must be known before the first paint, such as the
 * `initial` of an animation. A key handler reads the direction at the key
 * press instead, through `logicalArrowKey`.
 *
 * The server and the hydration pass read left to right, except in a direction
 * scope, which gives its direction on each side.
 *
 * @internal
 */
export function useIsRtl(target?: Element | null): boolean {
	const scope = useDirectionScope()

	const rtl = useSyncExternalStore(
		subscribe,
		() => readRtl(target ?? document.documentElement),
		() => false,
	)

	// The root element does not know a scope below it, so the scope decides
	// when there is no `target`.
	return target || !scope ? rtl : scope === 'rtl'
}
