// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createKeyedStore } from '../../utilities/keyed-store'

describe('createKeyedStore', () => {
	it('reads each key through the reader it was given', () => {
		const store = createKeyedStore((key: string) => key.length)

		expect(store.get('abc')).toBe(3)
	})

	it('calls only the listeners of the keys whose value changed', () => {
		const store = createKeyedStore((key: string) => new Set(['a']).has(key))

		const a = vi.fn()

		const b = vi.fn()

		const c = vi.fn()

		store.subscribe('a', a)

		store.subscribe('b', b)

		store.subscribe('c', c)

		const next = new Set(['b'])

		store.publish((key) => next.has(key))

		expect(a).toHaveBeenCalledTimes(1)

		expect(b).toHaveBeenCalledTimes(1)

		expect(c).not.toHaveBeenCalled()

		expect(store.get('a')).toBe(false)

		expect(store.get('b')).toBe(true)
	})

	it('reads the new value inside a listener', () => {
		const store = createKeyedStore<string, number | undefined>(() => undefined)

		let seen: number | undefined

		store.subscribe('x', () => {
			seen = store.get('x')
		})

		store.publish(() => 4)

		expect(seen).toBe(4)
	})

	it('compares values by Object.is', () => {
		const store = createKeyedStore<string, number>(() => Number.NaN)

		const listener = vi.fn()

		store.subscribe('x', listener)

		store.publish(() => Number.NaN)

		expect(listener).not.toHaveBeenCalled()
	})

	it('stops the calls after the unsubscribe', () => {
		const store = createKeyedStore(() => 0)

		const listener = vi.fn()

		const unsubscribe = store.subscribe('x', listener)

		unsubscribe()

		store.publish(() => 1)

		expect(listener).not.toHaveBeenCalled()
	})

	it('calls each listener that was subscribed when the publish started', () => {
		const store = createKeyedStore(() => 0)

		const second = vi.fn()

		let unsubscribeSecond = () => {}

		// The first listener removes the second one. The publish runs a copy of
		// the set, so the second listener still gets this change.
		store.subscribe('x', () => unsubscribeSecond())

		unsubscribeSecond = store.subscribe('x', second)

		store.publish(() => 1)

		expect(second).toHaveBeenCalledTimes(1)
	})
})
