'use client'

import { useState } from 'react'
import { Button } from 'ui/button'
import { Field, Label, Message } from 'ui/fieldset'
import { Form, type FormSubmitHandler } from 'ui/form'
import { Heading } from 'ui/heading'
import { Input } from 'ui/input'
import { AuthLayout } from 'ui/layouts'
import { Link } from 'ui/link'
import { useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { authMessages } from './auth-messages'
import { bifrost } from './bifrost'
import { chain, email, required } from './form-validators'
import { useServerError } from './use-server-error'

type ForgotPasswordValues = { email: string }

/**
 * Page that asks for a password reset link: posts the email to
 * `/auth/reset-password`.
 *
 * @remarks
 * The gateway gives the same answer when no account has the email, so the page
 * shows the same notice in both cases. The link in the email opens
 * `/reset-password` on this app.
 */
export function ForgotPasswordPage() {
	const intl = useIntl()

	const [sent, setSent] = useState(false)

	const [errorAlert, setServerError] = useServerError()

	const handleSubmit: FormSubmitHandler<ForgotPasswordValues> = async (values) => {
		try {
			const { response, error } = await bifrost.POST('/auth/reset-password', { body: values })

			if (response.ok) {
				setSent(true)

				return
			}

			setServerError(error?.message || intl.formatMessage(authMessages.requestFailed))
		} catch {
			setServerError(intl.formatMessage(authMessages.unexpected))
		}
	}

	return (
		<AuthLayout>
			<Form<ForgotPasswordValues>
				defaultValues={{ email: '' }}
				validate={{ email: chain(required(intl), email(intl)) }}
				onSubmit={handleSubmit}
			>
				<Stack gap="xl" className="w-full sm:max-w-sm p-6">
					<Heading className="text-center">{intl.formatMessage(authMessages.forgotTitle)}</Heading>

					{sent ? (
						<Text tone="success">{intl.formatMessage(authMessages.forgotSent)}</Text>
					) : (
						<Text>{intl.formatMessage(authMessages.forgotIntro)}</Text>
					)}

					{errorAlert}

					<Field>
						<Label>{intl.formatMessage(authMessages.email)}</Label>
						<Input type="email" name="email" autoComplete="email" />
						<Message name="email" />
					</Field>

					<Button type="submit" className="w-full">
						{intl.formatMessage(sent ? authMessages.sendAnotherLink : authMessages.sendLink)}
					</Button>

					<div className="text-center">
						<Text>
							<Link href="/login" underline>
								{intl.formatMessage(authMessages.backToSignIn)}
							</Link>
						</Text>
					</div>
				</Stack>
			</Form>
		</AuthLayout>
	)
}
