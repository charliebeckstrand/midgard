import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSession, GatewayError } = vi.hoisted(() => ({
	getSession: vi.fn(),
	GatewayError: class GatewayError extends Error {},
}))

vi.mock('auth', () => ({ getSession, GatewayError }))

import { authorize, issue, withUser } from '../../server/session-user'

function signedInWith(roles: string[], isVerified = true) {
	getSession.mockResolvedValue({ user: { id: 'u1', roles, is_verified: isVerified } })
}

describe('authorize', () => {
	beforeEach(() => {
		getSession.mockReset()
	})

	it('refuses a request without a session with a 401', async () => {
		getSession.mockResolvedValue(undefined)

		const result = await authorize()

		expect(result).toBeInstanceOf(Response)

		expect((result as Response).status).toBe(401)
	})

	// An outage must not send the user to `/login`, which a `401` does.
	it('answers a failed gateway with a 503', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})

		getSession.mockRejectedValue(new GatewayError('auth: GET /auth/session failed'))

		const result = await authorize()

		expect((result as Response).status).toBe(503)
	})

	it('lets any other error through', async () => {
		const error = new Error('bug')

		getSession.mockRejectedValue(error)

		await expect(authorize()).rejects.toBe(error)
	})

	it('lets an account with no role read', async () => {
		signedInWith([])

		expect(await authorize()).toBe('u1')
	})

	it('refuses a change from an account without the role with a 403', async () => {
		signedInWith([])

		const result = await authorize('user')

		expect((result as Response).status).toBe(403)
	})

	it('refuses a change from a user whose email is not verified with a 403', async () => {
		signedInWith(['user'], false)

		const result = await authorize('user')

		expect((result as Response).status).toBe(403)

		expect(await (result as Response).json()).toEqual({
			issues: ['Verify your email to change places.'],
		})
	})

	it('lets a user whose email is not verified read', async () => {
		signedInWith(['user'], false)

		expect(await authorize()).toBe('u1')
	})

	it('lets a user change data', async () => {
		signedInWith(['user'])

		expect(await authorize('user')).toBe('u1')
	})
})

describe('withUser', () => {
	beforeEach(() => {
		getSession.mockReset()
	})

	it('calls the handler with the user id before the route arguments', async () => {
		signedInWith(['user'])

		const handler = vi.fn(async (userId: string, id: string) => Response.json({ userId, id }))

		const response = await withUser('user', handler)('p1')

		expect(await response.json()).toEqual({ userId: 'u1', id: 'p1' })
	})

	it('returns the refusal and does not call the handler', async () => {
		signedInWith([])

		const handler = vi.fn(async () => new Response(null, { status: 204 }))

		const response = await withUser('user', handler)()

		expect(response.status).toBe(403)

		expect(handler).not.toHaveBeenCalled()
	})
})

describe('issue', () => {
	it('answers with the status and every message', async () => {
		const response = issue(400, 'First.', 'Second.')

		expect(response.status).toBe(400)

		expect(await response.json()).toEqual({ issues: ['First.', 'Second.'] })
	})
})
