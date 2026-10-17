// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createFormFieldTargets } from '../../primitives/form/form-field-targets'

describe('createFormFieldTargets', () => {
	it('registers the control id of a field', () => {
		const targets = createFormFieldTargets()

		targets.register('email', 'field-1')

		expect(targets.getSnapshot()).toEqual({ email: 'field-1' })
	})

	it('gives a new snapshot and notifies on a change only', () => {
		const targets = createFormFieldTargets()

		const listener = vi.fn()

		targets.subscribe(listener)

		targets.register('email', 'field-1')

		const snapshot = targets.getSnapshot()

		targets.register('email', 'field-1')

		expect(targets.getSnapshot()).toBe(snapshot)

		expect(listener).toHaveBeenCalledOnce()
	})

	it('removes the entry when the registration ends', () => {
		const targets = createFormFieldTargets()

		const unregister = targets.register('email', 'field-1')

		unregister()

		expect(targets.getSnapshot()).toEqual({})
	})

	it('keeps a later registration of the same name when the earlier one ends', () => {
		const targets = createFormFieldTargets()

		const unregisterFirst = targets.register('email', 'field-1')

		targets.register('email', 'field-2')

		unregisterFirst()

		expect(targets.getSnapshot()).toEqual({ email: 'field-2' })
	})

	it('keeps an entry while another registration of the same id lives', () => {
		const targets = createFormFieldTargets()

		// A control and its Message register one field with one id.
		const unregisterControl = targets.register('email', 'field-1')

		const unregisterMessage = targets.register('email', 'field-1')

		unregisterMessage()

		expect(targets.getSnapshot()).toEqual({ email: 'field-1' })

		unregisterControl()

		expect(targets.getSnapshot()).toEqual({})
	})

	it('falls back to the earlier registration when the later one ends', () => {
		const targets = createFormFieldTargets()

		targets.register('email', 'field-1')

		const unregisterLater = targets.register('email', 'field-2')

		unregisterLater()

		expect(targets.getSnapshot()).toEqual({ email: 'field-1' })
	})
})
