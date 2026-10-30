import { createElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ForgotPasswordPage } from '../auth/forgot-password-page'
import { LoginPage } from '../auth/login-page'
import { RegisterPage } from '../auth/register-page'
import { ResetPasswordPage } from '../auth/reset-password-page'
import { VerifyEmailPage } from '../auth/verify-email-page'
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

	it('shows its text, its notice, and its provider button in the language of the locale', () => {
		const html = renderInLocale('es', page)

		for (const text of [
			'Inicia sesión en tu cuenta',
			'Correo electrónico',
			'¿Olvidaste tu contraseña?',
			'Iniciar sesión con una llave de acceso',
			'Continuar con GitHub',
			'¿No tienes una cuenta?',
			'Revisa tu correo para terminar el registro y luego inicia sesión.',
		]) {
			expect(html).toContain(text)
		}
	})
})

describe('the other auth pages', () => {
	// Each row makes its page in the test, so the table holds no elements.
	const pages: [string, () => ReactNode, string[]][] = [
		[
			'RegisterPage',
			() => createElement(RegisterPage, {}),
			['Crea tu cuenta', 'Nombre completo', 'Crear cuenta', '¿Ya tienes una cuenta?'],
		],
		[
			'ForgotPasswordPage',
			() => createElement(ForgotPasswordPage),
			['Restablece tu contraseña', 'Enviar enlace', 'Volver a iniciar sesión'],
		],
		[
			'ResetPasswordPage',
			() => createElement(ResetPasswordPage),
			['Elige una contraseña nueva', 'Contraseña nueva', 'Establecer contraseña'],
		],
		[
			'VerifyEmailPage',
			() => createElement(VerifyEmailPage),
			['Verifica tu correo', 'Verificar correo'],
		],
	]

	it.each(pages)('%s shows its text in the language of the locale', (_, page, texts) => {
		const html = renderInLocale('es', page())

		for (const text of texts) expect(html).toContain(text)
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
