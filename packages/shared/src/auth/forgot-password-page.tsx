'use client'

import { useState } from 'react'
import { Button } from 'ui/button'
import { Field, Label, Message } from 'ui/fieldset'
import { Form, type FormSubmitHandler } from 'ui/form'
import { Heading } from 'ui/heading'
import { Input } from 'ui/input'
import { AuthLayout } from 'ui/layouts'
import { Link } from 'ui/link'
import { Text } from 'ui/text'
import { chain, email, required } from './form-validators'

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
	const [sent, setSent] = useState(false)

	const [serverError, setServerError] = useState('')

	const handleSubmit: FormSubmitHandler<ForgotPasswordValues> = async (values) => {
		try {
			const res = await fetch('/auth/reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(values),
			})

			if (res.ok) {
				setSent(true)

				return
			}

			const data = await res.json()

			setServerError(data.message || 'The request failed. Please try again.')
		} catch {
			setServerError('An unexpected error occurred. Please try again later.')
		}
	}

	return (
		<AuthLayout>
			<Form<ForgotPasswordValues>
				defaultValues={{ email: '' }}
				validate={{ email: chain(required(), email()) }}
				onSubmit={handleSubmit}
				className="grid gap-6 w-full sm:max-w-sm p-6"
			>
				<Heading className="text-center">Reset your password</Heading>

				{sent ? (
					<Text tone="success">
						If an account has that email, we sent it a link. The link works for one hour.
					</Text>
				) : (
					<Text>
						Type the email of your account. We will send you a link to set a new password.
					</Text>
				)}

				{serverError && <Text tone="error">{serverError}</Text>}

				<Field>
					<Label>Email</Label>
					<Input type="email" name="email" autoComplete="email" />
					<Message name="email" />
				</Field>

				<Button type="submit" className="w-full">
					{sent ? 'Send another link' : 'Send link'}
				</Button>

				<div className="text-center">
					<Text>
						<Link href="/login" underline>
							Back to sign in
						</Link>
					</Text>
				</div>
			</Form>
		</AuthLayout>
	)
}
