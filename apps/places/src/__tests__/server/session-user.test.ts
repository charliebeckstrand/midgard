import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSession = vi.hoisted(() => vi.fn())

vi.mock('auth', () => ({ getSession }))

import { authorize } from '../../server/session-user'

function signedInWith(roles: string[]) {
	getSession.mockResolvedValue({ user: { id: 'u1', roles } })
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

	it('lets a user change data', async () => {
		signedInWith(['user'])

		expect(await authorize('user')).toBe('u1')
	})
})
