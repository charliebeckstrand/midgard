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

type LoginValues = { email: string; password: string }

/**
 * Notice from the query: after registration (`?registered=true`), or after a
 * second step that the gateway no longer holds (`?expired=true`).
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

	if (params.get('expired') === 'true') {
		return <Text tone="error">Your sign-in expired. Please sign in again.</Text>
	}

	return params.get('registered') === 'true' ? (
		<Text tone="success">Account created successfully. Please sign in.</Text>
	) : null
}

/**
 * Sign-in page: signs in with a password or a passkey, and goes to `/` on success.
 *
 * @remarks
 * When the user has two-step sign-in on, the gateway answers the password with
 * `202` and sets a ticket cookie, and the page goes to `/login/verify` for the
 * second step ({@link SecondStepPage}). That page checks the ticket on the
 * server, so nobody can open it without a password step first.
 *
 * Next prerenders all of the page except the notices from the query, which
 * render only on the client.
 */
export function LoginPage() {
	const router = useRouter()

	const [serverError, setServerError] = useState('')

	// Goes to `/` on success, to the second step on a `202`, and shows the message
	// of the gateway on a failure.
	async function finish(res: Response) {
		if (res.status === 202) {
			router.push('/login/verify')

			return
		}

		if (res.ok) {
			router.push('/')

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
				</Field>

				<Button type="submit" className="w-full">
					Sign in
				</Button>

				<Button type="button" variant="outline" className="w-full" onClick={signInWithPasskey}>
					Sign in with a passkey
				</Button>

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
