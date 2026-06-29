import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isGuestRoute } from './routes.ts'

test('matches guest routes exactly', () => {
	assert.equal(isGuestRoute('/login'), true)

	assert.equal(isGuestRoute('/register'), true)
})

test('matches guest subpaths', () => {
	assert.equal(isGuestRoute('/login/sso'), true)

	assert.equal(isGuestRoute('/register/step-2'), true)
})

test('does not match on prefix without a path boundary', () => {
	assert.equal(isGuestRoute('/login-help'), false)

	assert.equal(isGuestRoute('/registered'), false)
})

test('does not match protected routes', () => {
	assert.equal(isGuestRoute('/'), false)

	assert.equal(isGuestRoute('/users'), false)

	assert.equal(isGuestRoute('/users/123'), false)
})
