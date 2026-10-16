import { startAuthentication } from '@simplewebauthn/browser'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { getSession, requireGateway, type Session } from 'auth'
import { type ReactElement, StrictMode } from 'react'
import { LoginPage } from 'shared/auth'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Login from '../../app/login/page'

// A browser resolves a same-origin path, and the `Request` of Node takes only an absolute URL.
vi.hoisted(() => {
	globalThis.Request = class extends Request {
		constructor(input: RequestInfo | URL, init?: RequestInit) {
			super(typeof input === 'string' ? new URL(input, 'http://localhost') : input, init)
		}
	}
})

vi.mock('auth', () => ({
	bifrost: { GET: vi.fn() },
	getSession: vi.fn(),
	getSignInProviders: vi.fn(async () => ['github']),
	requireGateway: vi.fn(),
}))

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }))

vi.mock('next/navigation', () => ({
	redirect: (url: string) => {
		throw new Error(`NEXT_REDIRECT ${url}`)
	},
	useRouter: () => router,
	useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@simplewebauthn/browser', () => ({ startAuthentication: vi.fn() }))

// The mocks of the modules keep their calls between the tests.
beforeEach(() => vi.clearAllMocks())

afterEach(cleanup)

/** A session of a user with the given roles, with or without the second step. */
function session(roles: string[], two_step: boolean): Session {
	return {
		user: {
			id: '550e8400-e29b-41d4-a716-446655440000',
			email: 'admin@example.com',
			name: null,
			is_active: true,
			is_verified: true,
			roles,
			created_at: '2026-01-01T00:00:00.000Z',
			updated_at: '2026-01-01T00:00:00.000Z',
		},
		two_step,
	} as Session
}

/** The redirect target of the page, or `undefined` when it renders. */
async function redirectOf(): Promise<string | undefined> {
	try {
		await Login()

		return undefined
	} catch (error) {
		return (error as Error).message.replace('NEXT_REDIRECT ', '')
	}
}

describe('Login', () => {
	it('shows the sign-in without links to register or reset a password', async () => {
		vi.mocked(getSession).mockResolvedValue(undefined)

		const page = (await Login()) as ReactElement<Record<string, unknown>>

		expect(page.props).toEqual({
			providers: ['github'],
			registration: false,
			passwordReset: false,
			secondStep: true,
		})

		render(page)

		expect(screen.queryByText('Forgot password?')).toBeNull()
		expect(screen.queryByText(/Don't have an account/)).toBeNull()
	})

	it('sends a user that is not an admin to /account', async () => {
		vi.mocked(getSession).mockResolvedValue(session(['user'], false))

		expect(await redirectOf()).toBe('/account')
	})

	it('sends an admin that passed the second step to /', async () => {
		vi.mocked(getSession).mockResolvedValue(session(['admin'], true))

		expect(await redirectOf()).toBe('/')
	})

	it('sends an admin without a second factor to /account', async () => {
		vi.mocked(getSession).mockResolvedValue(session(['admin'], false))
		vi.mocked(requireGateway).mockResolvedValue({
			enabled: false,
			passkeys: 0,
			totp: false,
			recovery_codes: 0,
		})

		expect(await redirectOf()).toBe('/account')
	})

	it('asks an admin without the second step for it', async () => {
		vi.mocked(getSession).mockResolvedValue(session(['admin'], false))
		vi.mocked(requireGateway).mockResolvedValue({
			enabled: true,
			passkeys: 1,
			totp: false,
			recovery_codes: 8,
		})

		const page = (await Login()) as ReactElement<Record<string, unknown>>

		expect(page.props).toEqual({ secondStep: true, methods: ['passkey', 'recovery_code'] })
	})
})

describe('LoginPage with the second step', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (request: Request) =>
				new URL(request.url).pathname === '/auth/session/verify/options'
					? Response.json({ challenge: 'c' })
					: Response.json({ two_step: true }),
			),
		)
	})

	it('starts the passkey check one time and goes to / after the proof', async () => {
		vi.mocked(startAuthentication).mockResolvedValue({ id: 'p' } as never)

		await act(async () => {
			render(
				<StrictMode>
					<LoginPage secondStep methods={['passkey', 'recovery_code']} />
				</StrictMode>,
			)
		})

		expect(screen.getByText('Confirm that it is you')).toBeTruthy()

		// The form of the second step is a chunk of its own, so it can show after the heading.
		await vi.waitFor(() => expect(router.push).toHaveBeenCalledExactlyOnceWith('/'))

		expect(startAuthentication).toHaveBeenCalledTimes(1)
	})

	it('keeps the passkey button when the browser refuses the check', async () => {
		vi.mocked(startAuthentication).mockRejectedValue(new Error('NotAllowedError'))

		await act(async () => {
			render(<LoginPage secondStep methods={['passkey']} />)
		})

		expect(
			await screen.findByText('The passkey check did not complete. Please try again.'),
		).toBeTruthy()
		expect(startAuthentication).toHaveBeenCalledTimes(1)
		expect(screen.getByRole('button', { name: 'Use a passkey' })).toBeTruthy()
		expect(router.push).not.toHaveBeenCalled()
	})

	it('refreshes the page after a password sign-in', async () => {
		render(<LoginPage secondStep />)

		fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@example.com' } })
		fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } })
		fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

		// The page loads the form of the second step, and then lets the server page select it.
		await vi.waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1))

		expect(router.push).not.toHaveBeenCalled()
	})
})
