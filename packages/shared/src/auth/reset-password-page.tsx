'use client'

import { useRouter } from 'next/navigation'
import { Button } from 'ui/button'
import { Field, Label, Message } from 'ui/fieldset'
import { Form, FormError, type FormSubmitHandler } from 'ui/form'
import { AuthLayout } from 'ui/layouts'
import { Link } from 'ui/link'
import { PasswordInput } from 'ui/password-input'
import { useIntl } from 'ui/primitives/intl'
import { Text } from 'ui/text'
import { getLinkSecret } from '../link-secrets'
import { AuthCard } from './auth-card'
import { authMessages } from './auth-messages'
import { bifrost } from './bifrost'
import { newPasswordRules } from './form-validators'
import { useLeaving } from './use-leaving'

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
 * The app moves the token from the `?token=` of the link into memory before
 * the page hydrates (`takeLinkSecrets` of `shared/link-secrets`). The page
 * reads it on the submit, so Next prerenders all of the page.
 */
export function ResetPasswordPage() {
	const intl = useIntl()

	const router = useRouter()

	const [leaving, leave] = useLeaving()

	const handleSubmit: FormSubmitHandler<ResetPasswordValues> = async (values) => {
		try {
			const { response, error } = await bifrost.POST('/auth/reset-password/confirm', {
				body: { token: getLinkSecret('token'), password: values.password },
			})

			// The form stays disabled until the login page replaces it.
			if (response.ok) {
				leave(() => router.push('/login?reset=true'))

				return
			}

			return { formError: error?.message || intl.formatMessage(authMessages.resetFailed) }
		} catch {
			return { formError: intl.formatMessage(authMessages.unexpected) }
		}
	}

	return (
		<AuthLayout>
			<Form<ResetPasswordValues>
				defaultValues={{ password: '', confirmPassword: '' }}
				validate={newPasswordRules(intl)}
				onSubmit={handleSubmit}
				disabled={leaving}
			>
				<AuthCard title={intl.formatMessage(authMessages.resetTitle)}>
					<FormError className="w-full" />

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
				</AuthCard>
			</Form>
		</AuthLayout>
	)
}
