import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { ForgotPasswordPage, RegisterPage, ResetPasswordPage } from 'shared/auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The router of the test does not load a page, so the form stays mounted after the push.
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }))

vi.mock('next/navigation', () => ({
	useRouter: () => router,
	useSearchParams: () => new URLSearchParams(),
}))

beforeEach(() => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => Response.json({})),
	)
})

// Each row gives the page, the values to type by label, the submit button, and the next page.
const pages: [string, () => ReactElement, Record<string, string>, string, string][] = [
	[
		'RegisterPage',
		() => <RegisterPage />,
		{
			Email: 'user@example.com',
			'Full name': 'Ada Lovelace',
			Password: 'correct horse',
			'Confirm password': 'correct horse',
		},
		'Create account',
		'/login?registered=true',
	],
	[
		'ResetPasswordPage',
		() => <ResetPasswordPage />,
		{ 'New password': 'correct horse', 'Confirm password': 'correct horse' },
		'Set password',
		'/login?reset=true',
	],
]

describe.each(pages)('%s', (_, page, values, submit, next) => {
	it('keeps the form disabled after a success, until the next page replaces it', async () => {
		render(page())

		for (const [label, value] of Object.entries(values)) {
			fireEvent.change(screen.getByLabelText(label), { target: { value } })
		}

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: submit }))
		})

		await vi.waitFor(() => expect(router.push).toHaveBeenCalledExactlyOnceWith(next))

		expect(screen.getByRole('button', { name: submit }).matches(':disabled')).toBe(true)
	})
})

describe('ForgotPasswordPage', () => {
	it('clears the error of a failed try after a success, and reads the notice as a status', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValueOnce(Response.json({ message: 'Too many requests' }, { status: 429 }))
				.mockResolvedValueOnce(Response.json({})),
		)

		render(<ForgotPasswordPage />)

		fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } })

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Send link' }))
		})

		await vi.waitFor(() =>
			expect(screen.getByRole('alert').textContent).toContain('Too many requests'),
		)

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Send link' }))
		})

		const notice = await screen.findByText(/we sent it a link/)

		expect(notice.getAttribute('role')).toBe('status')

		expect(screen.queryByRole('alert')).toBeNull()
	})
})
