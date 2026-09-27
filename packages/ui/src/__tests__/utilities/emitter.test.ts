// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createEmitter } from '../../utilities/emitter'

describe('createEmitter', () => {
	it('calls each listener once per emit, and stops after the unsubscribe', () => {
		const { subscribe, emit } = createEmitter()

		const listener = vi.fn()

		const unsubscribe = subscribe(listener)

		emit()

		expect(listener).toHaveBeenCalledTimes(1)

		unsubscribe()

		emit()

		expect(listener).toHaveBeenCalledTimes(1)
	})

	// A listener that subscribes another during an emit must not reach it in the same emit.
	it('calls the listeners that were present when the emit started', () => {
		const { subscribe, emit } = createEmitter()

		const late = vi.fn()

		subscribe(() => subscribe(late))

		emit()

		expect(late).not.toHaveBeenCalled()

		emit()

		expect(late).toHaveBeenCalledTimes(1)
	})
})
