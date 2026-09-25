import { describe, expect, it } from 'vitest'
import { isApiRoute, isGuestRoute } from '../routes'

describe('isGuestRoute', () => {
	it('matches the guest routes exactly', () => {
		expect(isGuestRoute('/login')).toBe(true)

		expect(isGuestRoute('/register')).toBe(true)
	})

	it('matches guest subpaths', () => {
		expect(isGuestRoute('/login/sso')).toBe(true)

		expect(isGuestRoute('/register/step-2')).toBe(true)
	})

	it('does not match a prefix without a path boundary', () => {
		expect(isGuestRoute('/login-help')).toBe(false)

		expect(isGuestRoute('/registered')).toBe(false)
	})

	it('does not match protected routes', () => {
		expect(isGuestRoute('/')).toBe(false)

		expect(isGuestRoute('/users')).toBe(false)

		expect(isGuestRoute('/users/123')).toBe(false)
	})
})

describe('isApiRoute', () => {
	it('matches the API route and its subpaths', () => {
		expect(isApiRoute('/api')).toBe(true)

		expect(isApiRoute('/api/users/123')).toBe(true)
	})

	it('does not match an API prefix without a path boundary', () => {
		expect(isApiRoute('/apis')).toBe(false)

		expect(isApiRoute('/users/api')).toBe(false)

		expect(isApiRoute('/')).toBe(false)
	})
})
