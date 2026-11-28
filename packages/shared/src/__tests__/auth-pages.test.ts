import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { LoginPage } from '../auth/login-page'
import { RegisterPage } from '../auth/register-page'
import { SecondStep } from '../auth/second-step'
import { renderInLocale } from './helpers/intl'

// The pages read the router and the query of the App Router, which a server
// render outside Next does not mount. The query holds the notice after a
// registration.
vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
	useSearchParams: () => new URLSearchParams('registered=true'),
}))

describe('LoginPage', () => {
	const page = createElement(LoginPage, { providers: ['github'] })

	it('shows its text in English', () => {
		const html = renderInLocale('en', page)

		expect(html).toContain('Sign in to your account')

		expect(html).toContain('Continue with GitHub')
	})
})

describe('RegisterPage', () => {
	// WCAG 1.3.5: each field that collects data about the user names its purpose.
	it('gives each field its autocomplete token', () => {
		const html = renderInLocale('en', createElement(RegisterPage, {}))

		const tokens = Object.fromEntries(
			[...html.matchAll(/<input[^>]*>/g)].map(([input]) => [
				input.match(/ name="([^"]*)"/)?.[1],
				input.match(/ autoComplete="([^"]*)"/)?.[1],
			]),
		)

		expect(tokens).toEqual({
			email: 'email',
			name: 'name',
			password: 'new-password',
			confirmPassword: 'new-password',
		})
	})
})

describe('SecondStep', () => {
	// No `autocomplete` token names a recovery code, so only the attribute masks it in the events trail.
	it('masks the recovery code field in the events trail', () => {
		const props = {
			methods: ['recovery_code' as const],
			onVerified: vi.fn(),
			onCancel: vi.fn(),
			cancelLabel: 'Cancel',
		}

		const html = renderInLocale('en', createElement(SecondStep, props))

		const code = html.match(/<input[^>]* name="code"[^>]*>/)?.[0]

		expect(code).toMatch(/ data-events-mask=/)
	})
})

// `FormSubmit` shows the loading state of its form, and the loading state
// cancels a second activation, so a double click sends one request.
describe('the submit button of each auth form', () => {
	it.each([
		['LoginPage', createElement(LoginPage, { providers: [] })],
		['RegisterPage', createElement(RegisterPage, {})],
		[
			'SecondStep',
			createElement(SecondStep, {
				methods: ['totp' as const],
				onVerified: vi.fn(),
				onCancel: vi.fn(),
				cancelLabel: 'Cancel',
			}),
		],
	])('is the FormSubmit of the form in %s', (_, page) => {
		const submits = renderInLocale('en', page).match(/<button[^>]* type="submit"[^>]*>/g) ?? []

		expect(submits).toHaveLength(1)

		expect(submits[0]).toContain('data-slot="form-submit"')
	})
})
