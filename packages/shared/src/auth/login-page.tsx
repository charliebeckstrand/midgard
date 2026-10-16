'use client'

import {
	type PublicKeyCredentialRequestOptionsJSON,
	startAuthentication,
} from '@simplewebauthn/browser'
import type { SignInProvider } from 'auth'
import dynamic from 'next/dynamic'
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
import { oauthStartPath, signInProviderNames, signOut } from './account'
import { bifrost } from './bifrost'
import { ErrorAlert } from './error-alert'
import { chain, email, required } from './form-validators'
import type { SecondFactorMethod } from './second-step-request'
import { useLeaving } from './use-leaving'
import { unexpectedError, useServerError } from './use-server-error'

type LoginValues = { email: string; password: string }

/**
 * The module of the second step. It carries the ui Dialog and the WebAuthn
 * code, and only a session that needs the second step uses it, so the sign-in
 * form does not wait for it.
 */
const loadSecondStep = () => import('./second-step')

/**
 * The form of the second step. The server renders it into the HTML of the
 * page, so the first paint has the form.
 */
const SecondStep = dynamic(() => loadSecondStep().then((module) => module.SecondStep))

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
	/**
	 * Show the link to `/register` below the form. Set `false` in an app that has
	 * no register page. @defaultValue `true`
	 */
	registration?: boolean
	/**
	 * Show the link to `/forgot-password` below the password. Set `false` in an
	 * app that has no forgot-password page. @defaultValue `true`
	 */
	passwordReset?: boolean
	/**
	 * Ask for the second step on this page. A password sign-in then refreshes the
	 * page and does not go to `/`, and a GitHub or Google sign-in comes back to
	 * `/login`.
	 * @defaultValue `false`
	 */
	secondStep?: boolean
	/**
	 * The second factors of a signed-in user that did not give the second step,
	 * from `secondFactorMethods`. With `secondStep`, the page shows the form of
	 * the second step in place of the sign-in.
	 */
	methods?: SecondFactorMethod[]
}

/**
 * Sign-in page: signs in with a password, a passkey, GitHub, or Google, and
 * goes to `/` on success.
 *
 * @remarks
 * A GitHub or Google button leaves the app for the provider. The gateway sends
 * the browser back to `/` (to `/login` with `secondStep`), or to
 * `/login?error=<code>` when the sign-in fails.
 *
 * A sign-in with a password, GitHub, or Google has one step. A passkey sign-in
 * gives the second step at once. Without `secondStep`, a page that needs the
 * second step asks for it later, in the `SecondStepDialog`.
 *
 * With `secondStep`, the server page decides after a password, GitHub, or
 * Google sign-in. The page must call `getSession` from `auth`, and send a
 * session that needs no second step somewhere else. For a session that needs
 * it, the page passes `methods`. The form of the second step then starts the
 * passkey check at once, and the page goes to `/` when the gateway accepts
 * the proof. After the fifth wrong
 * try, the gateway ends the session, and the page loads
 * `/login?expired=true`. "Sign out" ends the session.
 *
 * Next prerenders all of the page except the notices from the query, which
 * render only on the client.
 */
export function LoginPage({
	providers = [],
	registration = true,
	passwordReset = true,
	secondStep = false,
	methods,
}: LoginPageProps) {
	const router = useRouter()

	const [errorAlert, setServerError] = useServerError()

	const [leaving, leave] = useLeaving()

	const home = () => router.push('/')

	// Runs `next` after a success, and shows the message of the gateway on a failure.
	// The form stays disabled until the next page or the second step replaces it.
	function finish(
		{ response, error }: { response: Response; error?: { message: string } },
		next = home,
	) {
		if (response.ok) {
			leave(next)

			return
		}

		setServerError(error?.message || 'Login failed. Please check your credentials and try again.')
	}

	// A failed load refreshes too, and the form of the second step then loads its module again.
	function refreshWithSecondStep() {
		const refresh = () => router.refresh()

		loadSecondStep().then(refresh, refresh)
	}

	const handleSubmit: FormSubmitHandler<LoginValues> = async (values) => {
		try {
			// With `secondStep`, the refresh lets the server page select the second step or a redirect.
			// The module of the second step loads first, so the form shows with the new page.
			finish(
				await bifrost.POST('/auth/login', { body: values }),
				secondStep ? refreshWithSecondStep : home,
			)
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

	if (secondStep && methods && methods.length > 0) {
		return (
			<AuthLayout>
				<Stack gap="xl" className="w-full sm:max-w-sm p-6">
					<Heading className="text-center">Confirm that it is you</Heading>

					<SecondStep
						methods={methods}
						onVerified={home}
						// A full page load, so that no state of the second step stays.
						onExpired={() => window.location.assign('/login?expired=true')}
						onCancel={signOut}
						cancelLabel="Sign out"
						startPasskey
					/>
				</Stack>
			</AuthLayout>
		)
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
						{passwordReset && (
							<Text className="text-right">
								<Link href="/forgot-password" underline>
									Forgot password?
								</Link>
							</Text>
						)}
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
							onClick={() =>
								leave(() =>
									window.location.assign(
										oauthStartPath(provider, secondStep ? { returnTo: '/login' } : {}),
									),
								)
							}
						>
							Continue with {signInProviderNames[provider]}
						</Button>
					))}

					{registration && (
						<div className="text-center">
							<Text>
								Don't have an account?{' '}
								<Link href="/register" underline>
									Create one
								</Link>
							</Text>
						</div>
					)}
				</Stack>
			</Form>
		</AuthLayout>
	)
}
