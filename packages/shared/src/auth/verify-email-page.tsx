'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from 'ui/button'
import { announce } from 'ui/core'
import { Heading } from 'ui/heading'
import { AuthLayout } from 'ui/layouts'
import { Link } from 'ui/link'
import { useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/structure/stack'
import { Text } from 'ui/text'
import { getLinkSecret } from '../link-secrets'
import { authMessages } from './auth-messages'
import { bifrost } from './bifrost'
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
 * The app moves the token from the `?token=` of the link into memory before
 * the page hydrates (`takeLinkSecrets` of `shared/link-secrets`). The page
 * reads it on the click, so Next prerenders all of the page.
 *
 * The focus stays on the button while the request is open and after a
 * failure. After a success, the notice and its link replace the button, so
 * the focus moves to the link and the notice is announced (WCAG 2.4.3, 4.1.3).
 */
export function VerifyEmailPage() {
	const intl = useIntl()

	const [state, setState] = useState<'idle' | 'pending' | 'verified'>('idle')

	const [errorAlert, setServerError] = useServerError()

	const continueLink = useRef<HTMLAnchorElement>(null)

	useEffect(() => {
		if (state === 'verified') continueLink.current?.focus()
	}, [state])

	async function verify() {
		setState('pending')

		setServerError('')

		try {
			const { response, error } = await bifrost.POST('/auth/verify-email/confirm', {
				body: { token: getLinkSecret('token') },
			})

			if (response.ok) {
				setState('verified')

				announce(intl.formatMessage(authMessages.verified))

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
							<Link ref={continueLink} href="/" underline>
								{intl.formatMessage(authMessages.continue)}
							</Link>
						</Text>
					</>
				) : (
					<>
						{errorAlert}

						{/* A loading button stays enabled, so it keeps the focus. */}
						<Button className="w-full" loading={state === 'pending'} onClick={verify}>
							{intl.formatMessage(authMessages.verifyEmail)}
						</Button>
					</>
				)}
			</Stack>
		</AuthLayout>
	)
}
