// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createFormStore } from '../../modules/form/engine/form-store'
import type { FormStateValue } from '../../primitives/form/context'

function stateOf(values: Record<string, unknown>): FormStateValue {
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
		const initial = stateOf({ name: '' })

		const { store } = createFormStore(initial)

		expect(store.getState()).toBe(initial)

		expect(store.getServerState()).toBe(initial)
	})

	it('publishes a state to the subscribers, and keeps the server snapshot', () => {
		const initial = stateOf({ name: '' })

		const { store, publish } = createFormStore(initial)

		const listener = vi.fn()

		store.subscribe(listener)

		const next = stateOf({ name: 'Jane' })

		publish(next)

		expect(listener).toHaveBeenCalledOnce()

		expect(store.getState()).toBe(next)

		expect(store.getServerState()).toBe(initial)
	})

	it('stops a listener that unsubscribes', () => {
		const { store, publish } = createFormStore(stateOf({}))

		const listener = vi.fn()

		const unsubscribe = store.subscribe(listener)

		unsubscribe()

		publish(stateOf({ name: 'Jane' }))

		expect(listener).not.toHaveBeenCalled()
	})
})
