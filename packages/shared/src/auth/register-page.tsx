'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Field, Label, Message } from 'ui/fieldset'
import { Form, FormError, FormSubmit, type FormSubmitHandler } from 'ui/form'
import { Input } from 'ui/input'
import { AuthLayout } from 'ui/layouts'
import { Link } from 'ui/link'
import { PasswordInput } from 'ui/password-input'
import { useIntl } from 'ui/primitives/intl'
import { Text } from 'ui/text'
import { AuthCard } from './auth-card'
import { authMessages } from './auth-messages'
import { bifrost } from './bifrost'
import { chain, email, newPasswordRules, required } from './form-validators'
import { Turnstile } from './turnstile'
import { useLeaving } from './use-leaving'

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

			return { formError: error?.message || intl.formatMessage(authMessages.registrationFailed) }
		} catch {
			setTurnstileToken(null)

			setAttempt((prev) => prev + 1)

			return { formError: intl.formatMessage(authMessages.unexpected) }
		}
	}

	return (
		<AuthLayout>
			<Form<RegisterValues>
				defaultValues={{ email: '', name: '', password: '', confirmPassword: '' }}
				validate={{
					email: chain(required(intl), email(intl)),
					name: chain(required(intl)),
					...newPasswordRules(intl),
				}}
				onSubmit={handleSubmit}
				disabled={leaving}
			>
				<AuthCard title={intl.formatMessage(authMessages.registerTitle)}>
					<FormError className="w-full" />

					<Field>
						<Label>{intl.formatMessage(authMessages.email)}</Label>
						<Input type="email" name="email" autoComplete="email" />
						<Message name="email" />
					</Field>

					<Field>
						<Label>{intl.formatMessage(authMessages.fullName)}</Label>
						<Input name="name" autoComplete="name" />
						<Message name="name" />
					</Field>

					<Field>
						<Label>{intl.formatMessage(authMessages.password)}</Label>
						<PasswordInput name="password" autoComplete="new-password" />
						<Message name="password" />
					</Field>

					<Field>
						<Label>{intl.formatMessage(authMessages.confirmPassword)}</Label>
						<PasswordInput name="confirmPassword" autoComplete="new-password" />
						<Message name="confirmPassword" />
					</Field>

					{turnstileSiteKey && (
						<Turnstile key={attempt} siteKey={turnstileSiteKey} onToken={setTurnstileToken} />
					)}

					<FormSubmit className="w-full" disabled={Boolean(turnstileSiteKey) && !turnstileToken}>
						{intl.formatMessage(authMessages.createAccount)}
					</FormSubmit>

					<div className="text-center">
						<Text>
							{intl.formatMessage(authMessages.haveAccount)}{' '}
							<Link href="/login" underline>
								{intl.formatMessage(authMessages.signIn)}
							</Link>
						</Text>
					</div>
				</AuthCard>
			</Form>
		</AuthLayout>
	)
}
