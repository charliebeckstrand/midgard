import type { SyntheticEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	deriveStatus,
	handlePasswordInput,
} from '../../components/password-confirm/password-confirm-utilities'

describe('deriveStatus', () => {
	it.each<[string, string, string, 'password' | 'confirm' | null, 'idle' | 'warning']>([
		['returns idle when password is empty', '', 'x', 'password', 'idle'],
		['returns idle when confirm is empty', 'hunter2', '', 'password', 'idle'],
		['returns idle when both fields match', 'hunter2', 'hunter2', 'confirm', 'idle'],
		[
			'stays idle while typing the confirm field is shorter than password',
			'hunter2',
			'hunt',
			'confirm',
			'idle',
		],
		[
			'warns when the confirm field is the same length or longer but does not match',
			'hunter2',
			'hunter3',
			'confirm',
			'warning',
		],
		[
			'warns when the password field changed and now differs from confirm',
			'hunter2',
			'hunter3',
			'password',
			'warning',
		],
		[
			'warns when nothing has been edited yet but the values differ',
			'hunter2',
			'hunter3',
			null,
			'warning',
		],
	])('%s', (_name, password, confirm, lastEdited, expected) => {
		expect(deriveStatus(password, confirm, lastEdited)).toBe(expected)
	})
})

describe('handlePasswordInput', () => {
	function makeEvent(target: HTMLElement): SyntheticEvent<HTMLDivElement> {
		const partial: Partial<SyntheticEvent<HTMLDivElement>> = { target }

		return partial as SyntheticEvent<HTMLDivElement>
	}

	/** Runs the handler on `target` with a fresh spy for each setter. */
	function run(target: HTMLElement) {
		const setPassword = vi.fn()

		const setPasswordName = vi.fn()

		const setLastEdited = vi.fn()

		handlePasswordInput(makeEvent(target), setPassword, setPasswordName, setLastEdited)

		return { setPassword, setPasswordName, setLastEdited }
	}

	function input(attributes: { name?: string; slot?: string } = {}) {
		const el = document.createElement('input')

		if (attributes.name) el.name = attributes.name

		if (attributes.slot) el.dataset.slot = attributes.slot

		el.value = 'hunter2'

		return el
	}

	it('writes the value, name, and lastEdited when the password input changes', () => {
		const { setPassword, setPasswordName, setLastEdited } = run(input({ name: 'password' }))

		expect(setPassword).toHaveBeenCalledWith('hunter2')

		expect(setPasswordName).toHaveBeenCalledWith('password')

		expect(setLastEdited).toHaveBeenCalledWith('password')
	})

	it('treats a missing name attribute as undefined', () => {
		expect(run(input()).setPasswordName).toHaveBeenCalledWith(undefined)
	})

	it.each([
		[
			'the confirm input identified by its data-slot',
			() => input({ slot: 'password-confirm-input' }),
		],
		['targets that are not HTMLInputElement', () => document.createElement('div')],
	])('ignores %s', (_name, target) => {
		const { setPassword, setPasswordName, setLastEdited } = run(target())

		expect(setPassword).not.toHaveBeenCalled()

		expect(setPasswordName).not.toHaveBeenCalled()

		expect(setLastEdited).not.toHaveBeenCalled()
	})
})
