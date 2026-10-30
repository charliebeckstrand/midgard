'use client'

import { useRouter } from 'next/navigation'
import { Button } from 'ui/button'
import { Field, Label, Message } from 'ui/fieldset'
import { Form, type FormSubmitHandler } from 'ui/form'
import { Heading } from 'ui/heading'
import { AuthLayout } from 'ui/layouts'
import { Link } from 'ui/link'
import { PasswordInput } from 'ui/password-input'
import { useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { authMessages } from './auth-messages'
import { bifrost } from './bifrost'
import { chain, matches, minLength, required, validationMessages } from './form-validators'
import { linkToken } from './link-token'
import { useLeaving } from './use-leaving'
import { useServerError } from './use-server-error'

type ResetPasswordValues = { password: string; confirmPassword: string }

/**
 * Page that sets a new password: posts the token of the emailed link and the
 * new password to `/auth/reset-password/confirm`, and goes to
 * `/login?reset=true` on success.
 *
 * @remarks
 * The gateway signs the user out on all devices, so the user signs in again with
 * the new password. A link works one time, for one hour.
 *
 * The page reads the token from the `?token=` of the link on the submit, so Next
 * prerenders all of the page.
 */
export function ResetPasswordPage() {
	const intl = useIntl()

	const router = useRouter()

	const [errorAlert, setServerError] = useServerError()

	const [leaving, leave] = useLeaving()

	const handleSubmit: FormSubmitHandler<ResetPasswordValues> = async (values) => {
		try {
			const { response, error } = await bifrost.POST('/auth/reset-password/confirm', {
				body: { token: linkToken(), password: values.password },
			})

			// The form stays disabled until the login page replaces it.
			if (response.ok) {
				leave(() => router.push('/login?reset=true'))

				return
			}

			setServerError(error?.message || intl.formatMessage(authMessages.resetFailed))
		} catch {
			setServerError(intl.formatMessage(authMessages.unexpected))
		}
	}

	return (
		<AuthLayout>
			<Form<ResetPasswordValues>
				defaultValues={{ password: '', confirmPassword: '' }}
				validate={{
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
					<Heading className="text-center">{intl.formatMessage(authMessages.resetTitle)}</Heading>

					{errorAlert}

					<Field>
						<Label>{intl.formatMessage(authMessages.newPassword)}</Label>
						<PasswordInput name="password" autoComplete="new-password" />
						<Message name="password" />
					</Field>

					<Field>
						<Label>{intl.formatMessage(authMessages.confirmPassword)}</Label>
						<PasswordInput name="confirmPassword" autoComplete="new-password" />
						<Message name="confirmPassword" />
					</Field>

					<Button type="submit" className="w-full">
						{intl.formatMessage(authMessages.setPassword)}
					</Button>

					<div className="text-center">
						<Text>
							{intl.formatMessage(authMessages.linkExpired)}{' '}
							<Link href="/forgot-password" underline>
								{intl.formatMessage(authMessages.getNewLink)}
							</Link>
						</Text>
					</div>
				</Stack>
			</Form>
		</AuthLayout>
	)
}
