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
import { useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { authMessages } from './auth-messages'
import { bifrost } from './bifrost'
import { chain, email, matches, minLength, required, validationMessages } from './form-validators'
import { Turnstile } from './turnstile'
import { useLeaving } from './use-leaving'
import { useServerError } from './use-server-error'

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
	const intl = useIntl()

	const router = useRouter()

	const [errorAlert, setServerError] = useServerError()

	const [leaving, leave] = useLeaving()

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

			// The form stays disabled until the login page replaces it.
			if (response.ok) {
				leave(() => router.push('/login?registered=true'))

				return
			}

			setTurnstileToken(null)

			setAttempt((prev) => prev + 1)

			setServerError(error?.message || intl.formatMessage(authMessages.registrationFailed))
		} catch {
			setTurnstileToken(null)

			setAttempt((prev) => prev + 1)

			setServerError(intl.formatMessage(authMessages.unexpected))
		}
	}

	return (
		<AuthLayout>
			<Form<RegisterValues>
				defaultValues={{ email: '', name: '', password: '', confirmPassword: '' }}
				validate={{
					email: chain(required(intl), email(intl)),
					name: chain(required(intl)),
					password: chain(required(intl), minLength(intl, 8)),
					confirmPassword: chain(
						required(intl),
						matches('password', intl.formatMessage(validationMessages.passwordMismatch)),
					),
				}}
				onSubmit={handleSubmit}
				disabled={leaving}
			>
				<Stack gap="xl" className="w-full sm:max-w-sm p-6">
					<Heading className="text-center">
						{intl.formatMessage(authMessages.registerTitle)}
					</Heading>

					{errorAlert}

					<Field>
						<Label>{intl.formatMessage(authMessages.email)}</Label>
						<Input type="email" name="email" autoComplete="email" />
						<Message name="email" />
					</Field>

					<Field>
						<Label>{intl.formatMessage(authMessages.fullName)}</Label>
						<Input name="name" />
						<Message name="name" />
					</Field>

					<Field>
						<Label>{intl.formatMessage(authMessages.password)}</Label>
						<PasswordInput name="password" autoComplete="new-password" />
						<Message name="password" />
					</Field>

					<Field>
						<Label>{intl.formatMessage(authMessages.confirmPassword)}</Label>
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
						{intl.formatMessage(authMessages.createAccount)}
					</Button>

					<div className="text-center">
						<Text>
							{intl.formatMessage(authMessages.haveAccount)}{' '}
							<Link href="/login" underline>
								{intl.formatMessage(authMessages.signIn)}
							</Link>
						</Text>
					</div>
				</Stack>
			</Form>
		</AuthLayout>
	)
}
