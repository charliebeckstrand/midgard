'use client'

import { useState } from 'react'
import { Button } from 'ui/button'
import { Heading } from 'ui/heading'
import { AuthLayout } from 'ui/layouts'
import { Link } from 'ui/link'
import { useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/structure/stack'
import { Text } from 'ui/text'
import { authMessages } from './auth-messages'
import { bifrost } from './bifrost'
import { linkToken } from './link-token'
import { useServerError } from './use-server-error'

/**
 * Page that verifies an email: posts the token of the emailed link to
 * `/auth/verify-email/confirm` when the user clicks the button.
 *
 * @remarks
 * The page needs a click and does not verify when it opens. Thus a mail scanner
 * that opens the link does not use it. The page works with and without a
 * session, because the user can open the link on a different device.
 *
 * The page reads the token from the `?token=` of the link on the click, so Next
 * prerenders all of the page.
 */
export function VerifyEmailPage() {
	const intl = useIntl()

	const [state, setState] = useState<'idle' | 'pending' | 'verified'>('idle')

	const [errorAlert, setServerError] = useServerError()

	async function verify() {
		setState('pending')

		setServerError('')

		try {
			const { response, error } = await bifrost.POST('/auth/verify-email/confirm', {
				body: { token: linkToken() },
			})

			if (response.ok) {
				setState('verified')

				return
			}

			setServerError(error?.message || intl.formatMessage(authMessages.verifyFailed))
		} catch {
			setServerError(intl.formatMessage(authMessages.unexpected))
		}

		setState('idle')
	}

	return (
		<AuthLayout>
			<Stack gap="lg" className="w-full sm:max-w-sm p-6 text-center">
				<Heading>{intl.formatMessage(authMessages.verifyTitle)}</Heading>

				{state === 'verified' ? (
					<>
						<Text tone="success">{intl.formatMessage(authMessages.verified)}</Text>

						<Text>
							<Link href="/" underline>
								{intl.formatMessage(authMessages.continue)}
							</Link>
						</Text>
					</>
				) : (
					<>
						{errorAlert}

						<Button className="w-full" disabled={state === 'pending'} onClick={verify}>
							{intl.formatMessage(authMessages.verifyEmail)}
						</Button>
					</>
				)}
			</Stack>
		</AuthLayout>
	)
}
