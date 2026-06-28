import type { SyntheticEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	deriveStatus,
	handlePasswordInput,
} from '../../components/password-confirm/password-confirm-utilities'

describe('deriveStatus', () => {
	it('returns idle when password is empty', () => {
		expect(deriveStatus('', 'x', 'password')).toBe('idle')
	})

	it('returns idle when confirm is empty', () => {
		expect(deriveStatus('hunter2', '', 'password')).toBe('idle')
	})

	it('returns idle when both fields match', () => {
		expect(deriveStatus('hunter2', 'hunter2', 'confirm')).toBe('idle')
	})

	it('stays idle while typing the confirm field is shorter than password', () => {
		expect(deriveStatus('hunter2', 'hunt', 'confirm')).toBe('idle')
	})

	it('warns when the confirm field is the same length or longer but does not match', () => {
		expect(deriveStatus('hunter2', 'hunter3', 'confirm')).toBe('warning')
	})

	it('warns when the password field changed and now differs from confirm', () => {
		expect(deriveStatus('hunter2', 'hunter3', 'password')).toBe('warning')
	})

	it('warns when nothing has been edited yet but the values differ', () => {
		expect(deriveStatus('hunter2', 'hunter3', null)).toBe('warning')
	})
})

describe('handlePasswordInput', () => {
	function makeEvent(target: HTMLElement): SyntheticEvent<HTMLDivElement> {
		const partial: Partial<SyntheticEvent<HTMLDivElement>> = { target }

		return partial as SyntheticEvent<HTMLDivElement>
	}

	it('writes the value, name, and lastEdited when the password input changes', () => {
		const setPassword = vi.fn()

		const setPasswordName = vi.fn()

		const setLastEdited = vi.fn()

		const input = document.createElement('input')

		input.name = 'password'

		input.value = 'hunter2'

		handlePasswordInput(makeEvent(input), setPassword, setPasswordName, setLastEdited)

		expect(setPassword).toHaveBeenCalledWith('hunter2')

		expect(setPasswordName).toHaveBeenCalledWith('password')

		expect(setLastEdited).toHaveBeenCalledWith('password')
	})

	it('treats a missing name attribute as undefined', () => {
		const setPassword = vi.fn()

		const setPasswordName = vi.fn()

		const setLastEdited = vi.fn()

		const input = document.createElement('input')

		input.value = 'hunter2'

		handlePasswordInput(makeEvent(input), setPassword, setPasswordName, setLastEdited)

		expect(setPasswordName).toHaveBeenCalledWith(undefined)
	})

	it('ignores the confirm input identified by data-password-confirm-input', () => {
		const setPassword = vi.fn()

		const setPasswordName = vi.fn()

		const setLastEdited = vi.fn()

		const input = document.createElement('input')

		input.dataset.passwordConfirmInput = ''

		input.value = 'hunter2'

		handlePasswordInput(makeEvent(input), setPassword, setPasswordName, setLastEdited)

		expect(setPassword).not.toHaveBeenCalled()

		expect(setPasswordName).not.toHaveBeenCalled()

		expect(setLastEdited).not.toHaveBeenCalled()
	})

	it('ignores targets that are not HTMLInputElement', () => {
		const setPassword = vi.fn()

		const setPasswordName = vi.fn()

		const setLastEdited = vi.fn()

		const div = document.createElement('div')

		handlePasswordInput(makeEvent(div), setPassword, setPasswordName, setLastEdited)

		expect(setPassword).not.toHaveBeenCalled()

		expect(setPasswordName).not.toHaveBeenCalled()

		expect(setLastEdited).not.toHaveBeenCalled()
	})
})
