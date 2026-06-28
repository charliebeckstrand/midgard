import { afterEach, describe, expect, it } from 'vitest'
import { isTopDismissLayer, registerDismissLayer } from '../../utilities/dismiss-layers'

// The stack is module-level state. Track every registration and drain it in
// afterEach so a leaked layer can't corrupt a later shuffled test; the vmThreads
// pool resets the module per file, not per test.
const registered: Array<() => void> = []

function open() {
	const layer = {}

	const unregister = registerDismissLayer(layer)

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
})
