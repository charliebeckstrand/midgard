import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BIFROST_URL } from '../env'
import { getSession, requireAdmin } from '../session'

const cookies = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({ cookies }))

const user = {
	id: 'u1',
	email: 'ada@example.com',
	is_active: true,
	is_verified: true,
	role: 'user',
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
}

const session = {
	id: 's1',
	created_at: '2026-09-26T00:00:00Z',
	expires_at: '2026-10-26T00:00:00Z',
	user,
}

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

describe('getSession', () => {
	beforeEach(() => {
		cookies.mockResolvedValue({ toString: () => '__Host-session=abc' })
	})

	it('returns the session with its user', async () => {
		const fetch = stubGateway(200, session)

		await expect(getSession()).resolves.toEqual(session)

		const [url, init] = fetch.mock.calls[0] ?? []

		expect(url).toBe(`${BIFROST_URL}/auth/session`)

		expect(new Headers(init?.headers).get('cookie')).toBe('__Host-session=abc')
	})

	it('returns undefined for a 401, and does not log it', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		stubGateway(401)

		await expect(getSession()).resolves.toBeUndefined()

		expect(error).not.toHaveBeenCalled()
	})

	it('returns undefined for a failed status, and logs it', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		stubGateway(500)

		await expect(getSession()).resolves.toBeUndefined()

		expect(error).toHaveBeenCalledOnce()
	})

	it('returns undefined for a thrown request, and logs it', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')))

		await expect(getSession()).resolves.toBeUndefined()

		expect(error).toHaveBeenCalledOnce()
	})

	it('lets the dynamic-usage signal of a prerender through', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		const signal = Object.assign(new Error('Dynamic server usage'), {
			digest: 'DYNAMIC_SERVER_USAGE',
		})

		cookies.mockRejectedValue(signal)

		await expect(getSession()).rejects.toBe(signal)

		expect(error).not.toHaveBeenCalled()
	})
})

describe('requireAdmin', () => {
	beforeEach(() => {
		cookies.mockResolvedValue({ toString: () => '__Host-session=abc' })
	})

	it('returns the session of an admin', async () => {
		const admin = { ...session, user: { ...user, role: 'admin' } }

		stubGateway(200, admin)

		await expect(requireAdmin()).resolves.toEqual(admin)
	})

	it.each([
		['no session', 401, null],
		['the session of a user', 200, session],
	])('redirects to /login for %s', async (_, status, body) => {
		stubGateway(status, body)

		const error = await requireAdmin().catch((thrown: unknown) => thrown)

		expect(redirectTarget(error)).toBe('/login')
	})
})
