import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BIFROST_URL } from '../env'
import { GatewayError } from '../fetch'
import { getSession, requireAdmin, requireSession } from '../session'

const cookies = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({ cookies }))

const user = {
	id: 'u1',
	email: 'ada@example.com',
	is_active: true,
	is_verified: true,
	roles: ['user'],
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
}

const session = {
	id: 's1',
	created_at: '2026-09-26T00:00:00Z',
	expires_at: '2026-10-26T00:00:00Z',
	two_step: false,
	user,
}

// Stubs the gateway: `fetch` resolves to the given status and body.
function stubGateway(status: number, body: unknown = null) {
	const fetch = vi.fn(async (_request: Request) => Response.json(body, { status }))

	vi.stubGlobal('fetch', fetch)

	return fetch
}

// Stubs the cookie store of the request with a `cookie` header, such as `a=1; b=2`.
function cookieStore(header: string) {
	const names = header ? header.split('; ').map((pair) => pair.split('=')[0]) : []

	return { has: (name: string) => names.includes(name), toString: () => header }
}

// Next marks a redirect with the digest `NEXT_REDIRECT;<type>;<url>;<status>`.
function redirectTarget(error: unknown): string | undefined {
	const digest = (error as { digest?: string }).digest

	return digest?.startsWith('NEXT_REDIRECT') ? digest.split(';')[2] : undefined
}

describe('getSession', () => {
	beforeEach(() => {
		cookies.mockResolvedValue(cookieStore('__Host-session=abc'))
	})

	it('returns the session with its user', async () => {
		const fetch = stubGateway(200, session)

		await expect(getSession()).resolves.toEqual(session)

		const [request] = fetch.mock.calls[0] ?? []

		expect(request?.url).toBe(`${BIFROST_URL}/auth/session`)

		expect(request?.headers.get('cookie')).toBe('__Host-session=abc')
	})

	// Next does not hold a `Request` with an `init` for the dynamic stage, so the
	// read ends in the runtime stage, and its `Date.now()` is a prerender error.
	it('sends the request without an init', async () => {
		const fetch = stubGateway(200, session)

		await getSession()

		expect(fetch.mock.calls[0]).toHaveLength(1)
	})

	// A guest page reads the session on each request. Without the cookie, the
	// gateway can only answer `401`, so the read does not go to it.
	it('returns undefined without the session cookie, and does not ask the gateway', async () => {
		cookies.mockResolvedValue(cookieStore('theme=dark'))

		const fetch = stubGateway(401)

		await expect(getSession()).resolves.toBeUndefined()

		expect(fetch).not.toHaveBeenCalled()
	})

	it('returns undefined for a 401, and does not log it', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		stubGateway(401)

		await expect(getSession()).resolves.toBeUndefined()

		expect(error).not.toHaveBeenCalled()
	})

	// An outage must not look like a signed-out user, whom the pages send to `/login`.
	it('throws a GatewayError for a failed status', async () => {
		stubGateway(500)

		await expect(getSession()).rejects.toBeInstanceOf(GatewayError)
	})

	it('throws a GatewayError for a thrown request', async () => {
		const cause = new Error('connection refused')

		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(cause))

		await expect(getSession()).rejects.toMatchObject({ name: 'GatewayError', cause })
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

describe('requireSession', () => {
	beforeEach(() => {
		cookies.mockResolvedValue(cookieStore('__Host-session=abc'))
	})

	it('returns the session of a user', async () => {
		stubGateway(200, session)

		await expect(requireSession()).resolves.toEqual(session)
	})

	it('redirects to /login without a session', async () => {
		stubGateway(401)

		const error = await requireSession().catch((thrown: unknown) => thrown)

		expect(redirectTarget(error)).toBe('/login')
	})
})

describe('requireAdmin', () => {
	beforeEach(() => {
		cookies.mockResolvedValue(cookieStore('__Host-session=abc'))
	})

	it('returns the session of an admin that passed the second step', async () => {
		const admin = { ...session, two_step: true, user: { ...user, roles: ['user', 'admin'] } }

		stubGateway(200, admin)

		await expect(requireAdmin()).resolves.toEqual(admin)
	})

	it('redirects to /login without a session', async () => {
		stubGateway(401)

		const error = await requireAdmin().catch((thrown: unknown) => thrown)

		expect(redirectTarget(error)).toBe('/login')
	})

	it('redirects the session of a user to /account', async () => {
		stubGateway(200, session)

		const error = await requireAdmin().catch((thrown: unknown) => thrown)

		expect(redirectTarget(error)).toBe('/account')
	})

	it('redirects an admin session without the second step to /verify', async () => {
		stubGateway(200, { ...session, user: { ...user, roles: ['user', 'admin'] } })

		const error = await requireAdmin().catch((thrown: unknown) => thrown)

		expect(redirectTarget(error)).toBe('/verify')
	})
})
