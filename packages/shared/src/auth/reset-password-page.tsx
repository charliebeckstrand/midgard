'use client'

import { useRouter } from 'next/navigation'
import { Button } from 'ui/button'
import { Field, Label, Message } from 'ui/fieldset'
import { Form, type FormSubmitHandler } from 'ui/form'
import { Heading } from 'ui/heading'
import { AuthLayout } from 'ui/layouts'
import { Link } from 'ui/link'
import { PasswordInput } from 'ui/password-input'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { bifrost } from './bifrost'
import { chain, matches, minLength, required } from './form-validators'
import { linkToken } from './link-token'
import { unexpectedError, useServerError } from './use-server-error'

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
	const router = useRouter()

	const [errorAlert, setServerError] = useServerError()

	const handleSubmit: FormSubmitHandler<ResetPasswordValues> = async (values) => {
		try {
			const { response, error } = await bifrost.POST('/auth/reset-password/confirm', {
				body: { token: linkToken(), password: values.password },
			})

			if (response.ok) {
				router.push('/login?reset=true')

				return
			}

			setServerError(error?.message || 'The password did not change. Please try again.')
		} catch {
			setServerError(unexpectedError)
		}
	}

	return (
		<AuthLayout>
			<Form<ResetPasswordValues>
				defaultValues={{ password: '', confirmPassword: '' }}
				validate={{
					password: chain(required(), minLength(8)),
					confirmPassword: chain(required(), matches('password', 'password')),
				}}
				onSubmit={handleSubmit}
			>
				<Stack gap="xl" className="w-full sm:max-w-sm p-6">
					<Heading className="text-center">Choose a new password</Heading>

					{errorAlert}

					<Field>
						<Label>New password</Label>
						<PasswordInput name="password" autoComplete="new-password" />
						<Message name="password" />
					</Field>

					<Field>
						<Label>Confirm password</Label>
						<PasswordInput name="confirmPassword" autoComplete="new-password" />
						<Message name="confirmPassword" />
					</Field>

					<Button type="submit" className="w-full">
						Set password
					</Button>

					<div className="text-center">
						<Text>
							Link expired?{' '}
							<Link href="/forgot-password" underline>
								Get a new one
							</Link>
						</Text>
					</div>
				</Stack>
			</Form>
		</AuthLayout>
	)
}
