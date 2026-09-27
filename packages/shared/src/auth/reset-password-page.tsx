'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from 'ui/button'
import { Field, Label, Message } from 'ui/fieldset'
import { Form, type FormSubmitHandler } from 'ui/form'
import { Heading } from 'ui/heading'
import { AuthLayout } from 'ui/layouts'
import { Link } from 'ui/link'
import { PasswordInput } from 'ui/password-input'
import { Text } from 'ui/text'
import { chain, matches, minLength, required } from './form-validators'

type ResetPasswordValues = { password: string; confirmPassword: string }

type ResetPasswordPageProps = {
	/** The token from the `?token=` of the emailed link. */
	token: string
}

/**
 * Page that sets a new password: posts the token of the emailed link and the
 * new password to `/auth/reset-password/confirm`, and goes to
 * `/login?reset=true` on success.
 *
 * @remarks
 * The gateway signs the user out on all devices, so the user signs in again with
 * the new password. A link works one time, for one hour.
 */
export function ResetPasswordPage({ token }: ResetPasswordPageProps) {
	const router = useRouter()

	const [serverError, setServerError] = useState('')

	const handleSubmit: FormSubmitHandler<ResetPasswordValues> = async (values) => {
		try {
			const res = await fetch('/auth/reset-password/confirm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, password: values.password }),
			})

			if (res.ok) {
				router.push('/login?reset=true')

				return
			}

			const data = await res.json()

			setServerError(data.message || 'The password did not change. Please try again.')
		} catch {
			setServerError('An unexpected error occurred. Please try again later.')
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
				className="grid gap-6 w-full sm:max-w-sm p-6"
			>
				<Heading className="text-center">Choose a new password</Heading>

				{serverError && <Text tone="error">{serverError}</Text>}

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
			</Form>
		</AuthLayout>
	)
}
