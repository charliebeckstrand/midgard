import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	ensureSecondStep,
	fetchWithSecondStep,
	secondFactorMethods,
	setSecondStepDialog,
} from '../auth/second-step-request'

const factors = { passkeys: 1, totp: false, recovery_codes: 0 }

// Stubs the gateway: each path answers with the given status and body.
function stubGateway(routes: Record<string, () => Response>) {
	const fetch = vi.fn(
		async (path: string) => routes[path]?.() ?? new Response(null, { status: 404 }),
	)

	vi.stubGlobal('fetch', fetch)

	return fetch
}

const stepRequired = () => Response.json({ code: 'second_step_required' }, { status: 403 })

afterEach(() => {
	setSecondStepDialog(undefined)
})

describe('secondFactorMethods', () => {
	it.each([
		[{ passkeys: 0, totp: false, recovery_codes: 4 }, []],
		[{ passkeys: 2, totp: false, recovery_codes: 0 }, ['passkey']],
		[{ passkeys: 1, totp: true, recovery_codes: 3 }, ['passkey', 'totp', 'recovery_code']],
	])('offers %o as %o', (input, methods) => {
		expect(secondFactorMethods(input)).toEqual(methods)
	})
})

describe('ensureSecondStep', () => {
	it('passes a session that passed the second step, without the dialog', async () => {
		stubGateway({ '/auth/session': () => Response.json({ two_step: true }) })

		const open = vi.fn()

		setSecondStepDialog(open)

		await expect(ensureSecondStep()).resolves.toBe(true)

		expect(open).not.toHaveBeenCalled()
	})

	it('passes a user without a second factor, without the dialog', async () => {
		stubGateway({
			'/auth/session': () => Response.json({ two_step: false }),
			'/auth/mfa': () => Response.json({ passkeys: 0, totp: false, recovery_codes: 0 }),
		})

		const open = vi.fn()

		setSecondStepDialog(open)

		await expect(ensureSecondStep()).resolves.toBe(true)

		expect(open).not.toHaveBeenCalled()
	})

	it('opens the dialog one time for calls at the same time', async () => {
		stubGateway({
			'/auth/session': () => Response.json({ two_step: false }),
			'/auth/mfa': () => Response.json(factors),
		})

		const open = vi.fn(async () => true)

		setSecondStepDialog(open)

		await expect(Promise.all([ensureSecondStep(), ensureSecondStep()])).resolves.toEqual([
			true,
			true,
		])

		expect(open).toHaveBeenCalledTimes(1)

		expect(open).toHaveBeenCalledWith(['passkey'])
	})

	it('fails without a mounted dialog', async () => {
		stubGateway({
			'/auth/session': () => Response.json({ two_step: false }),
			'/auth/mfa': () => Response.json(factors),
		})

		await expect(ensureSecondStep()).resolves.toBe(false)
	})
})

describe('fetchWithSecondStep', () => {
	it('sends the request again after the second step', async () => {
		let tries = 0

		const fetch = stubGateway({
			'/auth/passkeys': () =>
				++tries === 1 ? stepRequired() : new Response(null, { status: 204 }),
			'/auth/session': () => Response.json({ two_step: false }),
			'/auth/mfa': () => Response.json(factors),
		})

		setSecondStepDialog(async () => true)

		const res = await fetchWithSecondStep('/auth/passkeys', { method: 'DELETE' })

		expect(res.status).toBe(204)

		expect(fetch).toHaveBeenLastCalledWith('/auth/passkeys', { method: 'DELETE' })
	})

	it('returns the first response when the user closes the dialog', async () => {
		stubGateway({
			'/auth/passkeys': stepRequired,
			'/auth/session': () => Response.json({ two_step: false }),
			'/auth/mfa': () => Response.json(factors),
		})

		setSecondStepDialog(async () => false)

		const res = await fetchWithSecondStep('/auth/passkeys', { method: 'DELETE' })

		expect(res.status).toBe(403)

		expect(await res.json()).toEqual({ code: 'second_step_required' })
	})

	it('returns another 403 as it is', async () => {
		const fetch = stubGateway({
			'/auth/passkeys': () => Response.json({ message: 'Sign in again' }, { status: 403 }),
		})

		const res = await fetchWithSecondStep('/auth/passkeys', { method: 'DELETE' })

		expect(res.status).toBe(403)

		expect(fetch).toHaveBeenCalledTimes(1)
	})
})
