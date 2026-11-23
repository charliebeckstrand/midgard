import { describe, expect, it, onTestFinished } from 'vitest'
import {
	closestFloatingPortal,
	containsThroughPortals,
	foreignFloatingPortal,
	hasPortalReference,
	portalReference,
	pressLandsInSurfaceOpenedWithin,
	publishPortalReference,
	referenceOpenedWithin,
} from '../../utilities/floating-portal-registry'

// The count of published references is module-level state, and the unit
// project runs with `isolate: false`. So each publication ends when its case
// finishes, and a leaked one cannot change a later shuffled case.

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

/** Publishes `reference` for the surface in `node`. The publication ends when the case finishes. */
function publish(node: Element, reference: () => Element | null) {
	const end = publishPortalReference(node, reference)

	onTestFinished(end)

	return end
}

describe('closestFloatingPortal', () => {
	it('finds the portal that holds an element', () => {
		const node = portal()

		expect(closestFloatingPortal(box(box(node)))).toBe(node)
	})

	it('finds no portal for an element on the page, and for a target that is not an element', () => {
		expect(closestFloatingPortal(box())).toBeNull()

		expect(closestFloatingPortal(null)).toBeNull()

		expect(closestFloatingPortal(undefined)).toBeNull()

		expect(closestFloatingPortal(window)).toBeNull()

		expect(closestFloatingPortal(document.createTextNode('text'))).toBeNull()
	})
})

describe('publishPortalReference', () => {
	it('publishes the reference until the teardown', () => {
		const node = portal()

		const reference = box()

		const end = publish(node, () => reference)

		expect(hasPortalReference(node)).toBe(true)

		expect(portalReference(node)).toBe(reference)

		end()

		expect(hasPortalReference(node)).toBe(false)

		expect(portalReference(node)).toBeNull()
	})

	it('reads the getter at each question, so a reference that moves is current', () => {
		const node = portal()

		let reference = box()

		publish(node, () => reference)

		reference = box()

		expect(portalReference(node)).toBe(reference)
	})

	it('keeps the entry of a later surface when the teardown of an earlier one runs', () => {
		const node = portal()

		const container = box()

		const earlier = publish(node, () => null)

		publish(node, () => box(container))

		earlier()

		expect(hasPortalReference(node)).toBe(true)

		// The count stays above zero, so the press test still asks the portal.
		expect(pressLandsInSurfaceOpenedWithin(container, box(node))).toBe(true)
	})

	it('answers no press after the last teardown', () => {
		const node = portal()

		const container = box()

		const end = publish(node, () => box(container))

		end()

		end()

		expect(pressLandsInSurfaceOpenedWithin(container, box(node))).toBe(false)
	})
})

describe('foreignFloatingPortal', () => {
	it('gives the portal of a press in another surface', () => {
		const node = portal()

		expect(foreignFloatingPortal(box(), box(node))).toBe(node)
	})

	it('gives no portal for a press in the own portal of the container', () => {
		const node = portal()

		expect(foreignFloatingPortal(box(node), box(node))).toBeNull()
	})

	it('gives no portal for a press on the page', () => {
		expect(foreignFloatingPortal(box(), box())).toBeNull()
	})
})

describe('containsThroughPortals', () => {
	it('holds an element in the container', () => {
		const container = box()

		expect(containsThroughPortals(container, box(container))).toBe(true)
	})

	it('holds an element in a surface that opened from the container, at any depth', () => {
		const container = box()

		const outer = portal()

		const inner = portal()

		publish(outer, () => box(container))

		publish(inner, () => box(outer))

		expect(containsThroughPortals(container, box(inner))).toBe(true)

		expect(referenceOpenedWithin(container, inner)).toBe(true)
	})

	it('does not hold an element in a surface that opened from elsewhere', () => {
		const node = portal()

		publish(node, () => box())

		expect(containsThroughPortals(box(), box(node))).toBe(false)
	})

	it('does not hold an element in a surface that published no reference', () => {
		const node = portal()

		expect(containsThroughPortals(box(), box(node))).toBe(false)

		expect(referenceOpenedWithin(box(), node)).toBe(false)
	})

	it('ends the search at a loop of references', () => {
		const first = portal()

		const second = portal()

		publish(first, () => box(second))

		publish(second, () => box(first))

		expect(containsThroughPortals(box(), box(first))).toBe(false)
	})

	it('holds nothing for no element', () => {
		expect(containsThroughPortals(box(), null)).toBe(false)
	})
})

describe('pressLandsInSurfaceOpenedWithin', () => {
	it('answers no with no published reference', () => {
		const container = box()

		expect(pressLandsInSurfaceOpenedWithin(container, box(portal()))).toBe(false)
	})

	it('answers yes for a press in a surface that opened from the container', () => {
		const container = box()

		const node = portal()

		publish(node, () => box(container))

		expect(pressLandsInSurfaceOpenedWithin(container, box(node))).toBe(true)
	})

	it('answers no for a press in a surface that opened from elsewhere, and for a press on the page', () => {
		const container = box()

		const node = portal()

		publish(node, () => box())

		expect(pressLandsInSurfaceOpenedWithin(container, box(node))).toBe(false)

		expect(pressLandsInSurfaceOpenedWithin(container, box())).toBe(false)
	})

	it('answers no for a press in the own portal of the container', () => {
		const node = portal()

		const container = box(node)

		publish(node, () => box(container))

		expect(pressLandsInSurfaceOpenedWithin(container, box(node))).toBe(false)
	})
})
