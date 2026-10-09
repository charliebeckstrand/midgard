'use client'

import {
	type PublicKeyCredentialRequestOptionsJSON,
	startAuthentication,
} from '@simplewebauthn/browser'
import type { SignInProvider } from 'auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Button } from 'ui/button'
import { Field, Label, Message } from 'ui/fieldset'
import { Form, type FormSubmitHandler } from 'ui/form'
import { Heading } from 'ui/heading'
import { Input } from 'ui/input'
import { AuthLayout } from 'ui/layouts'
import { Link } from 'ui/link'
import { PasswordInput } from 'ui/password-input'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { oauthStartPath, signInProviderNames } from './account'
import { bifrost } from './bifrost'
import { ErrorAlert } from './error-alert'
import { chain, email, required } from './form-validators'
import { useLeaving } from './use-leaving'
import { unexpectedError, useServerError } from './use-server-error'

type LoginValues = { email: string; password: string }

const passkeyFailed = 'Passkey sign-in did not complete. Please try again.'

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
		return <ErrorAlert key={error}>{signInErrors[error] ?? signInErrors.oauth_failed}</ErrorAlert>
	}

	if (params.get('expired') === 'true') {
		return <ErrorAlert>Too many wrong tries. Please sign in again.</ErrorAlert>
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

	const [errorAlert, setServerError] = useServerError()

	const [leaving, leave] = useLeaving()

	// Goes to `/` on success, and shows the message of the gateway on a failure.
	// The form stays disabled until the next page replaces it.
	function finish({ response, error }: { response: Response; error?: { message: string } }) {
		if (response.ok) {
			leave(() => router.push('/'))

			return
		}

		setServerError(error?.message || 'Login failed. Please check your credentials and try again.')
	}

	const handleSubmit: FormSubmitHandler<LoginValues> = async (values) => {
		try {
			finish(await bifrost.POST('/auth/login', { body: values }))
		} catch {
			setServerError(unexpectedError)
		}
	}

	// The gateway gives a challenge, the browser signs it with a passkey of the
	// user, and the gateway checks the result. A cancel in the browser throws.
	async function signInWithPasskey() {
		try {
			const { data: options } = await bifrost.POST('/auth/login/options')

			if (!options) {
				setServerError(passkeyFailed)

				return
			}

			// The gateway passes the options of the browser API through, so its spec names no fields.
			const optionsJSON = options as PublicKeyCredentialRequestOptionsJSON

			const credential = await startAuthentication({ optionsJSON })

			finish(await bifrost.POST('/auth/login/passkey', { body: credential }))
		} catch {
			setServerError(passkeyFailed)
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
			>
				<Stack gap="xl" className="w-full sm:max-w-sm p-6">
					<Heading className="text-center">Sign in to your account</Heading>

					{errorAlert}

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
							onClick={() => leave(() => window.location.assign(oauthStartPath(provider)))}
						>
							Continue with {signInProviderNames[provider]}
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
				</Stack>
			</Form>
		</AuthLayout>
	)
}
