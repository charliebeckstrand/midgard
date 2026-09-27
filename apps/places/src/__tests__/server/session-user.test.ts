import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSession = vi.hoisted(() => vi.fn())

vi.mock('auth', () => ({ getSession }))

import { authorize } from '../../server/session-user'

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
