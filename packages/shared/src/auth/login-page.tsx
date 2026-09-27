'use client'

import { startAuthentication } from '@simplewebauthn/browser'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Button } from 'ui/button'
import { Field, Label, Message } from 'ui/fieldset'
import { Form, type FormSubmitHandler } from 'ui/form'
import { Heading } from 'ui/heading'
import { Input } from 'ui/input'
import { AuthLayout } from 'ui/layouts'
import { Link } from 'ui/link'
import { PasswordInput } from 'ui/password-input'
import { Text } from 'ui/text'
import { chain, email, required } from './form-validators'
import { useLeaving } from './use-leaving'

type LoginValues = { email: string; password: string }

/** A provider that a user can sign in with. It matches the `SignInProvider` of `auth`. */
export type SignInProvider = 'github' | 'google'

const providerNames: Record<SignInProvider, string> = { github: 'GitHub', google: 'Google' }

/** The messages of the `?error=` codes that a GitHub or Google sign-in comes back with. */
const signInErrors: Record<string, string> = {
	oauth_failed: 'That sign-in did not complete. Please try again.',
	oauth_unavailable: 'That sign-in method is not available.',
	email_unverified: 'That account has no verified email. Verify it with the provider first.',
	account_exists:
		'An account with that email already exists. Sign in with it, then connect this account from the account page.',
	account_inactive: 'Account is inactive.',
}

/**
 * Notice from the query: after registration (`?registered=true`), after a
 * password reset (`?reset=true`), after too many wrong tries of the second
 * step (`?expired=true`), or after a GitHub or Google sign-in that failed
 * (`?error=<code>`).
 *
 * @internal
 * @remarks
 * The only reader of `useSearchParams` on the page. A prerender cannot read the
 * query, so it skips the nearest `Suspense` boundary and leaves that part to the
 * client. Keep this component in its own boundary, so that the rest of the form
 * stays in the prerendered HTML.
 */
function QueryNotice() {
	const params = useSearchParams()

	const error = params.get('error')

	if (error) {
		return <Text tone="error">{signInErrors[error] ?? signInErrors.oauth_failed}</Text>
	}

	if (params.get('expired') === 'true') {
		return <Text tone="error">Too many wrong tries. Please sign in again.</Text>
	}

	if (params.get('reset') === 'true') {
		return <Text tone="success">Your password is set. Please sign in.</Text>
	}

	return params.get('registered') === 'true' ? (
		<Text tone="success">Check your email to finish signing up, then sign in.</Text>
	) : null
}

type LoginPageProps = {
	/**
	 * The providers that the gateway has set up, from `getSignInProviders` of
	 * `auth`. Each gets a button. @defaultValue `[]`
	 */
	providers?: SignInProvider[]
}

/**
 * Sign-in page: signs in with a password, a passkey, GitHub, or Google, and
 * goes to `/` on success.
 *
 * @remarks
 * A GitHub or Google button leaves the app for the provider. The gateway sends
 * the browser back to `/`, or to `/login?error=<code>` when the sign-in fails.
 *
 * A sign-in with a password, GitHub, or Google has one step. A page that needs
 * the second step asks for it later: the admin app at `/verify`, and another
 * app in the `SecondStepDialog`. A passkey sign-in gives the second step
 * at once.
 *
 * Next prerenders all of the page except the notices from the query, which
 * render only on the client.
 */
export function LoginPage({ providers = [] }: LoginPageProps) {
	const router = useRouter()

	const [serverError, setServerError] = useState('')

	const [leaving, leave] = useLeaving()

	// Goes to `/` on success, and shows the message of the gateway on a failure.
	// The form stays disabled until the next page replaces it.
	async function finish(res: Response) {
		if (res.ok) {
			leave(() => router.push('/'))

			return
		}

		const data = await res.json()

		setServerError(data.message || 'Login failed. Please check your credentials and try again.')
	}

	const handleSubmit: FormSubmitHandler<LoginValues> = async (values) => {
		try {
			await finish(
				await fetch('/auth/login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(values),
				}),
			)
		} catch {
			setServerError('An unexpected error occurred. Please try again later.')
		}
	}

	// The gateway gives a challenge, the browser signs it with a passkey of the
	// user, and the gateway checks the result. A cancel in the browser throws.
	async function signInWithPasskey() {
		try {
			const options = await fetch('/auth/login/options', { method: 'POST' })

			const credential = await startAuthentication({ optionsJSON: await options.json() })

			await finish(
				await fetch('/auth/login/passkey', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(credential),
				}),
			)
		} catch {
			setServerError('Passkey sign-in did not complete. Please try again.')
		}
	}

	return (
		<AuthLayout>
			<Form<LoginValues>
				defaultValues={{ email: '', password: '' }}
				validate={{
					email: chain(required(), email()),
					password: chain(required()),
				}}
				onSubmit={handleSubmit}
				disabled={leaving}
				className="grid gap-6 w-full sm:max-w-sm p-6"
			>
				<Heading className="text-center">Sign in to your account</Heading>

				{serverError && <Text tone="error">{serverError}</Text>}

				<Suspense>
					<QueryNotice />
				</Suspense>

				<Field>
					<Label>Email</Label>
					<Input type="email" name="email" autoComplete="email" />
					<Message name="email" />
				</Field>

				<Field>
					<Label>Password</Label>
					<PasswordInput name="password" autoComplete="current-password" />
					<Message name="password" />
					<Text className="text-right">
						<Link href="/forgot-password" underline>
							Forgot password?
						</Link>
					</Text>
				</Field>

				<Button type="submit" className="w-full">
					Sign in
				</Button>

				<Button type="button" variant="outline" className="w-full" onClick={signInWithPasskey}>
					Sign in with a passkey
				</Button>

				{providers.map((provider) => (
					<Button
						key={provider}
						type="button"
						variant="outline"
						className="w-full"
						// A full page load: the gateway answers with a redirect to the provider.
						onClick={() => leave(() => window.location.assign(`/auth/oauth/${provider}/start`))}
					>
						Continue with {providerNames[provider]}
					</Button>
				))}

				<div className="text-center">
					<Text>
						Don't have an account?{' '}
						<Link href="/register" underline>
							Create one
						</Link>
					</Text>
				</div>
			</Form>
		</AuthLayout>
	)
}
