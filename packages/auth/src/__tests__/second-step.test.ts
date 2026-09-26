import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BIFROST_URL } from '../env'
import { forwardToSecondStep, getSecondStep, requireSecondStep } from '../second-step'

const cookies = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({ cookies }))

// Stubs the gateway: `fetch` resolves to the given status and body.
function stubGateway(status: number, body: unknown = null) {
	const fetch = vi.fn(async (_url: string, _init?: RequestInit) => Response.json(body, { status }))

	vi.stubGlobal('fetch', fetch)

	return fetch
}

// Next marks a redirect with the digest `NEXT_REDIRECT;<type>;<url>;<status>`.
function redirectTarget(error: unknown): string | undefined {
	const digest = (error as { digest?: string }).digest

	return digest?.startsWith('NEXT_REDIRECT') ? digest.split(';')[2] : undefined
}

describe('requireSecondStep', () => {
	beforeEach(() => {
		cookies.mockResolvedValue({ has: () => true, toString: () => '__Host-mfa=ticket' })
	})

	it('returns the methods of a live sign-in, and forwards the ticket cookie', async () => {
		const fetch = stubGateway(200, { methods: ['totp', 'recovery_code'] })

		await expect(requireSecondStep()).resolves.toEqual(['totp', 'recovery_code'])

		const [url, init] = fetch.mock.calls[0] ?? []

		expect(url).toBe(`${BIFROST_URL}/auth/login/mfa`)

		expect(new Headers(init?.headers).get('cookie')).toBe('__Host-mfa=ticket')
	})

	it('redirects to /login for a 410, and does not log it', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		stubGateway(410, { message: 'Sign in again' })

		expect(redirectTarget(await requireSecondStep().catch((e) => e))).toBe('/login')

		expect(error).not.toHaveBeenCalled()

		error.mockRestore()
	})

	it('redirects to /login and logs another failure', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		stubGateway(500)

		expect(redirectTarget(await requireSecondStep().catch((e) => e))).toBe('/login')

		expect(error).toHaveBeenCalledWith('auth: GET /auth/login/mfa failed (500)')

		error.mockRestore()
	})

	it('redirects to /login when the gateway is down', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('fetch failed')
			}),
		)

		expect(redirectTarget(await requireSecondStep().catch((e) => e))).toBe('/login')

		expect(error).toHaveBeenCalled()

		error.mockRestore()
	})

	it('redirects to /login for an empty list of methods', async () => {
		stubGateway(200, { methods: [] })

		expect(redirectTarget(await requireSecondStep().catch((e) => e))).toBe('/login')
	})

	it('sends no request without the ticket cookie', async () => {
		cookies.mockResolvedValue({ has: () => false, toString: () => '' })

		const fetch = stubGateway(200, { methods: ['totp'] })

		expect(redirectTarget(await requireSecondStep().catch((e) => e))).toBe('/login')

		expect(fetch).not.toHaveBeenCalled()
	})
})

describe('getSecondStep', () => {
	it('returns undefined for a 410', async () => {
		cookies.mockResolvedValue({ has: () => true, toString: () => '__Host-mfa=ticket' })

		stubGateway(410)

		await expect(getSecondStep()).resolves.toBeUndefined()
	})
})

describe('forwardToSecondStep', () => {
	beforeEach(() => {
		cookies.mockResolvedValue({ has: () => true, toString: () => '__Host-mfa=ticket' })
	})

	it('redirects to /login/verify while a sign-in is pending', async () => {
		stubGateway(200, { methods: ['totp'] })

		expect(redirectTarget(await forwardToSecondStep().catch((e) => e))).toBe('/login/verify')
	})

	it('stays on the page when no sign-in is pending', async () => {
		stubGateway(410)

		await expect(forwardToSecondStep()).resolves.toBeUndefined()
	})
})
