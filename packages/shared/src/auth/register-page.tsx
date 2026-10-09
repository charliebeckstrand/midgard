'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
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
import { bifrost } from './bifrost'
import { chain, email, matches, minLength, required } from './form-validators'
import { Turnstile } from './turnstile'
import { unexpectedError, useServerError } from './use-server-error'

type RegisterValues = {
	email: string
	name: string
	password: string
	confirmPassword: string
}

type RegisterPageProps = {
	/**
	 * The key to show Cloudflare Turnstile with, from `getTurnstileSiteKey` of
	 * the `auth` package. Without a key, the page shows no check.
	 */
	turnstileSiteKey?: string | null
}

/**
 * Registration page: posts the new account to `/auth/register`, and goes to
 * `/login?registered=true` on success.
 *
 * @remarks
 * The form checks that `confirmPassword` matches `password` before it submits.
 * With `turnstileSiteKey`, the submit button waits for the Turnstile token.
 * A token is good for one try, so a failed try mounts a new widget.
 */
export function RegisterPage({ turnstileSiteKey }: RegisterPageProps) {
	const router = useRouter()

	const [errorAlert, setServerError] = useServerError()

	const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

	const [attempt, setAttempt] = useState(0)

	const handleSubmit: FormSubmitHandler<RegisterValues> = async (values) => {
		try {
			const { response, error } = await bifrost.POST('/auth/register', {
				body: {
					email: values.email,
					password: values.password,
					name: values.name,
					turnstile_token: turnstileToken ?? undefined,
				},
			})

			if (response.ok) {
				router.push('/login?registered=true')

				return
			}

			setTurnstileToken(null)

			setAttempt((n) => n + 1)

			setServerError(
				error?.message || 'Registration failed. Please check your details and try again.',
			)
		} catch {
			setTurnstileToken(null)

			setAttempt((n) => n + 1)

			setServerError(unexpectedError)
		}
	}

	return (
		<AuthLayout>
			<Form<RegisterValues>
				defaultValues={{ email: '', name: '', password: '', confirmPassword: '' }}
				validate={{
					email: chain(required(), email()),
					name: chain(required()),
					password: chain(required(), minLength(8)),
					confirmPassword: chain(required(), matches('password', 'password')),
				}}
				onSubmit={handleSubmit}
			>
				<Stack gap="xl" className="w-full sm:max-w-sm p-6">
					<Heading className="text-center">Create your account</Heading>

					{errorAlert}

					<Field>
						<Label>Email</Label>
						<Input type="email" name="email" autoComplete="email" />
						<Message name="email" />
					</Field>

					<Field>
						<Label>Full name</Label>
						<Input name="name" />
						<Message name="name" />
					</Field>

					<Field>
						<Label>Password</Label>
						<PasswordInput name="password" autoComplete="new-password" />
						<Message name="password" />
					</Field>

					<Field>
						<Label>Confirm password</Label>
						<PasswordInput name="confirmPassword" />
						<Message name="confirmPassword" />
					</Field>

					{turnstileSiteKey && (
						<Turnstile key={attempt} siteKey={turnstileSiteKey} onToken={setTurnstileToken} />
					)}

					<Button
						type="submit"
						className="w-full"
						disabled={Boolean(turnstileSiteKey) && !turnstileToken}
					>
						Create account
					</Button>

					<div className="text-center">
						<Text>
							Already have an account?{' '}
							<Link href="/login" underline>
								Sign in
							</Link>
						</Text>
					</div>
				</Stack>
			</Form>
		</AuthLayout>
	)
}
