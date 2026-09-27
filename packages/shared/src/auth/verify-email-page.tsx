'use client'

import { useState } from 'react'
import { Button } from 'ui/button'
import { Heading } from 'ui/heading'
import { AuthLayout } from 'ui/layouts'
import { Link } from 'ui/link'
import { Stack } from 'ui/structure/stack'
import { Text } from 'ui/text'

type VerifyEmailPageProps = {
	/** The token from the `?token=` of the emailed link. */
	token: string
}

/**
 * Page that verifies an email: posts the token of the emailed link to
 * `/auth/verify-email/confirm` when the user clicks the button.
 *
 * @remarks
 * The page needs a click and does not verify when it opens. Thus a mail scanner
 * that opens the link does not use it. The page works with and without a
 * session, because the user can open the link on a different device.
 */
export function VerifyEmailPage({ token }: VerifyEmailPageProps) {
	const [state, setState] = useState<'idle' | 'pending' | 'verified'>('idle')

	const [serverError, setServerError] = useState('')

	async function verify() {
		setState('pending')

		setServerError('')

		try {
			const res = await fetch('/auth/verify-email/confirm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token }),
			})

			if (res.ok) {
				setState('verified')

				return
			}

			const data = await res.json()

			setServerError(data.message || 'The email was not verified. Please try again.')
		} catch {
			setServerError('An unexpected error occurred. Please try again later.')
		}

		setState('idle')
	}

	return (
		<AuthLayout>
			<Stack gap="lg" className="w-full sm:max-w-sm p-6">
				<Heading className="text-center">Verify your email</Heading>

				{state === 'verified' ? (
					<>
						<Text tone="success">Your email is verified.</Text>

						<Text className="text-center">
							<Link href="/" underline>
								Continue
							</Link>
						</Text>
					</>
				) : (
					<>
						{serverError && <Text tone="error">{serverError}</Text>}

						<Button className="w-full" disabled={state === 'pending'} onClick={verify}>
							Verify email
						</Button>
					</>
				)}
			</Stack>
		</AuthLayout>
	)
}
