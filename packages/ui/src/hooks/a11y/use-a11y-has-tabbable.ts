'use client'

import { useEffect, useState } from 'react'
import { FOCUSABLE_SELECTOR } from '../../utilities'

/**
 * Whether `node` holds a descendant in the tab order, re-measured as the
 * subtree changes. Drives behavior that only makes sense around reachable
 * controls: a tabpanel's own tab stop, an interactive Tooltip's focus trap.
 *
 * @param node - The measured element, held as state from a callback ref
 * (`ref={setNode}`) rather than read from an object ref. Observation must
 * follow the node React attaches, and a portalled surface mounts its content a
 * commit after the consumer renders — a `RefObject` reports that arrival to
 * nothing, so the probe would read `null` once and never re-run.
 * @returns `false` until the post-mount effect measures, so a surface that
 * keys chrome off the result gets it on the commit after the node attaches.
 *
 * @remarks The `MutationObserver` watches only the attributes the selector
 * reads — unfiltered, every inline-style write would register, and Motion
 * writes `element.style` per frame, so any animation on or inside the subtree
 * would re-run the query every frame.
 */
export function useA11yHasTabbable(node: HTMLElement | null): boolean {
	const [hasTabbable, setHasTabbable] = useState(false)

	useEffect(() => {
		if (!node) {
			setHasTabbable(false)

			return
		}

		const update = () => {
			setHasTabbable(node.querySelector(FOCUSABLE_SELECTOR) !== null)
		}

		update()

		const observer = new MutationObserver(update)

		observer.observe(node, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['tabindex', 'disabled', 'href'],
		})

		return () => observer.disconnect()
	}, [node])

	return hasTabbable
}
