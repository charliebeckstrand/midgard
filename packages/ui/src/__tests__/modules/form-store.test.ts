// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createFormStore } from '../../modules/form/engine/form-store'
import type { FormStateValue } from '../../primitives/form/context'

function makeState(values: Record<string, unknown>): FormStateValue {
	return {
		values,
		errors: {},
		touchedFields: {},
		dirtyFields: {},
		dirty: false,
		valid: true,
		submitting: false,
	}
}

describe('createFormStore', () => {
	it('starts both snapshots from the first state', () => {
		const initial = makeState({ name: '' })

		const { store } = createFormStore(initial)

		expect(store.getState()).toBe(initial)

		expect(store.getServerState()).toBe(initial)
	})

	it('publishes a state to the subscribers, and keeps the server snapshot', () => {
		const initial = makeState({ name: '' })

		const { store, publish } = createFormStore(initial)

		const listener = vi.fn()

		store.subscribe(listener)

		const next = makeState({ name: 'Jane' })

		publish(next)

		expect(listener).toHaveBeenCalledOnce()

		expect(store.getState()).toBe(next)

		expect(store.getServerState()).toBe(initial)
	})

	it('stops a listener that unsubscribes', () => {
		const { store, publish } = createFormStore(makeState({}))

		const listener = vi.fn()

		const unsubscribe = store.subscribe(listener)

		unsubscribe()

		publish(makeState({ name: 'Jane' }))

		expect(listener).not.toHaveBeenCalled()
	})
})
