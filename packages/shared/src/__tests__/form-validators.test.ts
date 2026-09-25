import { describe, expect, it, vi } from 'vitest'
import { chain, email, matches, minLength, required } from '../auth/form-validators'

describe('required', () => {
	it('fails on an empty or whitespace-only value', () => {
		expect(required()('', {})).toBe('This field is required')

		expect(required()('   ', {})).toBe('This field is required')
	})

	it('passes a value with content', () => {
		expect(required()(' a ', {})).toBeNull()
	})

	it('uses a given message', () => {
		expect(required('Enter a name')('', {})).toBe('Enter a name')
	})
})

describe('email', () => {
	it.each(['ada@example.com', 'a.b+c@mail.example.org'])('passes %s', (value) => {
		expect(email()(value, {})).toBeNull()
	})

	it.each(['', 'ada', 'ada@example', '@example.com', 'ada @example.com'])('fails %j', (value) => {
		expect(email()(value, {})).toBe('Please enter a valid email address')
	})
})

describe('minLength', () => {
	it('passes a value at the minimum length', () => {
		expect(minLength(8)('12345678', {})).toBeNull()
	})

	it('fails a shorter value with the default message', () => {
		expect(minLength(8)('1234567', {})).toBe('Must be at least 8 characters')
	})

	it('uses a given message', () => {
		expect(minLength(8, 'Too short')('', {})).toBe('Too short')
	})
})

describe('matches', () => {
	it('passes when the value equals the other field', () => {
		expect(matches('password', 'password')('secret', { password: 'secret' })).toBeNull()
	})

	it('fails when the value differs from the other field', () => {
		expect(matches('password', 'password')('secre', { password: 'secret' })).toBe(
			'Must match password',
		)
	})
})

describe('chain', () => {
	it('returns undefined when each validator passes', () => {
		expect(chain(required(), email())('ada@example.com', {})).toBeUndefined()
	})

	it('returns the first error, and does not run the validators after it', () => {
		const later = vi.fn(() => 'later')

		expect(chain(required(), later)('', {})).toBe('This field is required')

		expect(later).not.toHaveBeenCalled()
	})

	it('gives each validator the form values', () => {
		const validate = chain(required(), matches('password', 'password'))

		expect(validate('secret', { password: 'other' })).toBe('Must match password')
	})
})
