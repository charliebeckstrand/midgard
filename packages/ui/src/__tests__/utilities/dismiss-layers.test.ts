// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import {
	isTopDismissLayer,
	nextDismissOrder,
	registerDismissLayer,
} from '../../utilities/dismiss-layers'

// The stack is module-level state. Track every registration and drain it in
// afterEach so a leaked layer can't corrupt a later shuffled test: the unit
// project runs `isolate: false`, so nothing resets this module — not per test,
// and not per file either.
const registered: Array<() => void> = []

function open(order?: number) {
	const layer = {}

	const unregister = registerDismissLayer(layer, order)

	registered.push(unregister)

	return { layer, unregister }
}

afterEach(() => {
	for (const unregister of registered.splice(0)) unregister()
})

describe('dismiss layers', () => {
	it('reports false when the stack is empty', () => {
		expect(isTopDismissLayer({})).toBe(false)
	})

	it('reports a freshly registered layer as topmost', () => {
		const { layer } = open()

		expect(isTopDismissLayer(layer)).toBe(true)
	})

	it('treats only the innermost (last-registered) layer as topmost', () => {
		const outer = open()

		const inner = open()

		expect(isTopDismissLayer(inner.layer)).toBe(true)

		expect(isTopDismissLayer(outer.layer)).toBe(false)
	})

	it('restores the previous layer to the top once the innermost unregisters', () => {
		const outer = open()

		const inner = open()

		inner.unregister()

		expect(isTopDismissLayer(outer.layer)).toBe(true)
	})

	it('is a no-op when a layer unregisters twice, leaving the rest intact', () => {
		const outer = open()

		const inner = open()

		inner.unregister()

		inner.unregister()

		expect(isTopDismissLayer(outer.layer)).toBe(true)
	})

	it('stacks by open order, not by registration order', () => {
		const parentOrder = nextDismissOrder()

		const childOrder = nextDismissOrder()

		const child = open(childOrder)

		const parent = open(parentOrder)

		expect(isTopDismissLayer(child.layer)).toBe(true)

		parent.unregister()

		expect(isTopDismissLayer(child.layer)).toBe(true)
	})

	it('never sorts an ordered layer below a layer with no order', () => {
		const earlier = nextDismissOrder()

		const plain = open()

		const ordered = open(earlier)

		expect(isTopDismissLayer(ordered.layer)).toBe(true)

		ordered.unregister()

		expect(isTopDismissLayer(plain.layer)).toBe(true)
	})

	it('sorts an ordered layer below later ordered layers', () => {
		const earlier = nextDismissOrder()

		const later = open(nextDismissOrder())

		open(earlier)

		expect(isTopDismissLayer(later.layer)).toBe(true)
	})
})
