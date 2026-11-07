// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createFormFieldTargets } from '../../primitives/form/form-field-targets'

describe('createFormFieldTargets', () => {
	it('registers the control id of a field', () => {
		const targets = createFormFieldTargets()

		targets.register('email', 'field-1')

		expect(targets.getSnapshot()).toEqual({ email: { id: 'field-1' } })
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

		expect(targets.getSnapshot()).toEqual({ email: { id: 'field-2' } })
	})

	it('keeps an entry while another registration of the same id lives', () => {
		const targets = createFormFieldTargets()

		// A control and its Message register one field with one id.
		const unregisterControl = targets.register('email', 'field-1')

		const unregisterMessage = targets.register('email', 'field-1')

		unregisterMessage()

		expect(targets.getSnapshot()).toEqual({ email: { id: 'field-1' } })

		unregisterControl()

		expect(targets.getSnapshot()).toEqual({})
	})

	it('falls back to the earlier registration when the later one ends', () => {
		const targets = createFormFieldTargets()

		targets.register('email', 'field-1')

		const unregisterLater = targets.register('email', 'field-2')

		unregisterLater()

		expect(targets.getSnapshot()).toEqual({ email: { id: 'field-1' } })
	})

	it('gives a field the label of its control', () => {
		const targets = createFormFieldTargets()

		targets.register('email', 'field-1')

		const unregisterLabel = targets.registerLabel('field-1', 'Email')

		expect(targets.getSnapshot()).toEqual({ email: { id: 'field-1', label: 'Email' } })

		unregisterLabel()

		expect(targets.getSnapshot()).toEqual({ email: { id: 'field-1' } })
	})

	it('keeps a label that registers before the control of its field', () => {
		const targets = createFormFieldTargets()

		targets.registerLabel('field-1', 'Email')

		expect(targets.getSnapshot()).toEqual({})

		targets.register('email', 'field-1')

		expect(targets.getSnapshot()).toEqual({ email: { id: 'field-1', label: 'Email' } })
	})

	it('follows the label of the id that a field gives now', () => {
		const targets = createFormFieldTargets()

		targets.registerLabel('field-1', 'Email')

		targets.registerLabel('field-2', 'Work email')

		targets.register('email', 'field-1')

		const unregisterLater = targets.register('email', 'field-2')

		expect(targets.getSnapshot()).toEqual({ email: { id: 'field-2', label: 'Work email' } })

		unregisterLater()

		expect(targets.getSnapshot()).toEqual({ email: { id: 'field-1', label: 'Email' } })
	})

	it('notifies on a label change only', () => {
		const targets = createFormFieldTargets()

		targets.register('email', 'field-1')

		const listener = vi.fn()

		targets.subscribe(listener)

		// A label of a control that no field registered changes no target.
		targets.registerLabel('field-9', 'Other')

		expect(listener).not.toHaveBeenCalled()

		targets.registerLabel('field-1', 'Email')

		expect(listener).toHaveBeenCalledOnce()
	})
})
