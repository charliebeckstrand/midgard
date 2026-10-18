import { describe, expect, it, vi } from 'vitest'
import {
	chain,
	email,
	matches,
	minLength,
	required,
	validationMessages,
} from '../auth/form-validators'
import { intlFor } from './helpers/intl'

const en = intlFor('en')

const es = intlFor('es')

const mismatch = en.formatMessage(validationMessages.passwordMismatch)

describe('required', () => {
	it('fails on an empty or whitespace-only value', () => {
		expect(required(en)('', {})).toBe('This field is required')

		expect(required(en)('   ', {})).toBe('This field is required')
	})

	it('passes a value with content', () => {
		expect(required(en)(' a ', {})).toBeNull()
	})

	it('uses a given message', () => {
		expect(required(en, 'Enter a name')('', {})).toBe('Enter a name')
	})
})

describe('email', () => {
	it.each(['ada@example.com', 'a.b+c@mail.example.org'])('passes %s', (value) => {
		expect(email(en)(value, {})).toBeNull()
	})

	it.each(['', 'ada', 'ada@example', '@example.com', 'ada @example.com'])('fails %j', (value) => {
		expect(email(en)(value, {})).toBe('Please enter a valid email address')
	})
})

describe('minLength', () => {
	it('passes a value at the minimum length', () => {
		expect(minLength(en, 8)('12345678', {})).toBeNull()
	})

	it('fails a shorter value with the default message', () => {
		expect(minLength(en, 8)('1234567', {})).toBe('Must be at least 8 characters')
	})

	it('uses a given message', () => {
		expect(minLength(en, 8, 'Too short')('', {})).toBe('Too short')
	})
})

describe('matches', () => {
	it('passes when the value equals the other field', () => {
		expect(matches('password', mismatch)('secret', { password: 'secret' })).toBeNull()
	})

	it('fails when the value differs from the other field', () => {
		expect(matches('password', mismatch)('secre', { password: 'secret' })).toBe(
			'Must match password',
		)
	})
})

describe('chain', () => {
	it('returns undefined when each validator passes', () => {
		expect(chain(required(en), email(en))('ada@example.com', {})).toBeUndefined()
	})

	it('returns the first error, and does not run the validators after it', () => {
		const later = vi.fn(() => 'later')

		expect(chain(required(en), later)('', {})).toBe('This field is required')

		expect(later).not.toHaveBeenCalled()
	})

	it('gives each validator the form values', () => {
		const validate = chain(required(en), matches('password', mismatch))

		expect(validate('secret', { password: 'other' })).toBe('Must match password')
	})
})

describe('validators in a locale', () => {
	it('words a minimum of one in the singular', () => {
		expect(minLength(en, 1)('', {})).toBe('Must be at least 1 character')
	})

	it('words each default message in the language of the locale', () => {
		expect(required(es)('', {})).toBe('Este campo es obligatorio')

		expect(email(es)('ada', {})).toBe('Introduce una dirección de correo electrónico válida')

		expect(minLength(es, 8)('', {})).toBe('Debe tener al menos 8 caracteres')

		expect(minLength(es, 1)('', {})).toBe('Debe tener al menos 1 carácter')

		expect(es.formatMessage(validationMessages.passwordMismatch)).toBe(
			'Debe coincidir con la contraseña',
		)
	})
})
