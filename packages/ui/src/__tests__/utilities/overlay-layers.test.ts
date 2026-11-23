import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { publishPortalReference } from '../../utilities/floating-portal-registry'
import {
	isCoveredByOverlay,
	isUnderEnteringOverlay,
	registerEnteringOverlay,
	registerOverlayLayer,
	subscribeOverlayLayers,
} from '../../utilities/overlay-layers'

// The stacks are module-level state, and the unit project runs with
// `isolate: false`. So each registration ends when its case finishes, and a
// leaked layer cannot change a later shuffled case.

/** An element in the document, removed when the case finishes. */
function box(parent: Element = document.body, attributes: Record<string, string> = {}): Element {
	const element = document.createElement('div')

	for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)

	parent.append(element)

	onTestFinished(() => element.remove())

	return element
}

/** A floating portal node, as `Portal` stamps it. */
const portal = () => box(document.body, { 'data-floating-ui-portal': '' })

/** Opens an overlay over `scope`, or over the viewport. It closes when the case finishes. */
function open(scope: Element | null = null) {
	const node = box()

	const close = registerOverlayLayer({ node, scope })

	onTestFinished(close)

	return { node, close }
}

/** Publishes `reference` for the surface in `node`, until the case finishes. */
function publish(node: Element, reference: () => Element | null) {
	onTestFinished(publishPortalReference(node, reference))
}

describe('isCoveredByOverlay', () => {
	it('covers nothing with no open overlay', () => {
		expect(isCoveredByOverlay(box())).toBe(false)
	})

	it('covers an anchor on the page under an overlay of the viewport', () => {
		const anchor = box()

		open()

		expect(isCoveredByOverlay(anchor)).toBe(true)
	})

	it('covers an anchor in the scope of an overlay, and not an anchor outside it', () => {
		const scope = box()

		const inside = box(scope)

		const outside = box()

		open(scope)

		expect(isCoveredByOverlay(inside)).toBe(true)

		expect(isCoveredByOverlay(outside)).toBe(false)
	})

	it('covers an anchor in an overlay only with an overlay above it', () => {
		const lower = open()

		const anchor = box(lower.node)

		expect(isCoveredByOverlay(anchor)).toBe(false)

		open()

		expect(isCoveredByOverlay(anchor)).toBe(true)
	})

	it('reads the highest overlay that holds the anchor', () => {
		const outer = open()

		const inner = box(outer.node)

		// The inner overlay renders in the node of the outer one, and opens later.
		const close = registerOverlayLayer({ node: inner, scope: null })

		onTestFinished(close)

		expect(isCoveredByOverlay(box(inner))).toBe(false)
	})

	it('does not cover an anchor in an overlay with a scoped overlay above it elsewhere', () => {
		const lower = open()

		const anchor = box(lower.node)

		open(box())

		expect(isCoveredByOverlay(anchor)).toBe(false)
	})

	it('stops covering when the overlay closes, and a second close does nothing', () => {
		const anchor = box()

		const { close } = open()

		close()

		expect(isCoveredByOverlay(anchor)).toBe(false)

		const listener = vi.fn()

		onTestFinished(subscribeOverlayLayers(listener))

		close()

		expect(listener).not.toHaveBeenCalled()
	})

	describe('an anchor in a floating surface', () => {
		it('follows the reference of the surface to the overlay that it opened from', () => {
			const top = open()

			const surface = portal()

			publish(surface, () => box(top.node))

			// The surface opened from the top overlay, so nothing is above it.
			expect(isCoveredByOverlay(box(surface))).toBe(false)
		})

		it('covers an anchor in a surface that opened from the page under an overlay', () => {
			const surface = portal()

			const reference = box()

			publish(surface, () => reference)

			open()

			expect(isCoveredByOverlay(box(surface))).toBe(true)
		})

		it('follows a chain of surfaces', () => {
			const outer = portal()

			const inner = portal()

			const page = box()

			publish(outer, () => page)

			publish(inner, () => box(outer))

			open()

			expect(isCoveredByOverlay(box(inner))).toBe(true)
		})

		it('does not cover an anchor in a surface that published no reference', () => {
			const surface = portal()

			open()

			expect(isCoveredByOverlay(box(surface))).toBe(false)
		})

		it('does not cover an anchor in surfaces whose references make a loop', () => {
			const first = portal()

			const second = portal()

			publish(first, () => box(second))

			publish(second, () => box(first))

			open()

			expect(isCoveredByOverlay(box(first))).toBe(false)
		})
	})
})

describe('subscribeOverlayLayers', () => {
	it('tells a listener of each open and close, until it unsubscribes', () => {
		const listener = vi.fn()

		const unsubscribe = subscribeOverlayLayers(listener)

		onTestFinished(unsubscribe)

		const { close } = open()

		close()

		expect(listener).toHaveBeenCalledTimes(2)

		unsubscribe()

		open()

		expect(listener).toHaveBeenCalledTimes(2)
	})

	it('tells a listener of the start and the end of a fade', () => {
		const listener = vi.fn()

		onTestFinished(subscribeOverlayLayers(listener))

		const end = registerEnteringOverlay({ node: () => null, scope: null })

		end()

		end()

		expect(listener).toHaveBeenCalledTimes(2)
	})
})

describe('isUnderEnteringOverlay', () => {
	/** Records a fade over `scope`, until the case finishes. */
	function fade(node: () => Element | null, scope: Element | null = null) {
		const end = registerEnteringOverlay({ node, scope })

		onTestFinished(end)

		return end
	}

	it('reports no fade with no entering overlay', () => {
		expect(isUnderEnteringOverlay(box())).toBe(false)
	})

	it('covers each element in the scope before the portal mounts the node', () => {
		const scope = box()

		fade(() => null, scope)

		expect(isUnderEnteringOverlay(box(scope))).toBe(true)

		expect(isUnderEnteringOverlay(box())).toBe(false)
	})

	it('does not cover an element in its own node', () => {
		const node = box()

		fade(() => node)

		expect(isUnderEnteringOverlay(box(node))).toBe(false)

		expect(isUnderEnteringOverlay(box())).toBe(true)
	})

	it('stops covering when the fade ends', () => {
		const element = box()

		const end = fade(() => null)

		end()

		expect(isUnderEnteringOverlay(element)).toBe(false)
	})
})
