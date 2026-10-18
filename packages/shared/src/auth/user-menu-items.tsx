'use client'

import type { User } from 'auth'
import { LogOut, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { Icon } from 'ui/icon'
import { MenuItem, MenuLabel, MenuSeparator } from 'ui/menu'
import { useIntl } from 'ui/primitives/intl'
import { sendVerificationEmail, signOut } from './account'
import { authMessages } from './auth-messages'

/** Where sending a verification link stands, and the label it shows. */
const verifyLabels = {
	idle: authMessages.verifyMenu,
	sent: authMessages.verifyMenuSent,
	failed: authMessages.verifyMenuFailed,
} as const

/**
 * The user menu item that sends a verification link, and a separator below it.
 * It renders nothing when the email of the user is verified.
 *
 * @remarks The item stays open when you select it, and its label shows the
 * result. After the link is sent, the item is disabled. Put it directly above
 * {@link SignOutMenuItem}.
 */
export function VerifyEmailMenuItem({ user }: { user: User }) {
	const intl = useIntl()

	const [verify, setVerify] = useState<keyof typeof verifyLabels>('idle')

	if (user.is_verified) return null

	function sendVerification() {
		sendVerificationEmail().then(
			() => setVerify('sent'),
			() => setVerify('failed'),
		)
	}

	return (
		<>
			<MenuItem onAction={sendVerification} disabled={verify === 'sent'} closeOnAction={false}>
				<Icon icon={<MailCheck />} />
				<MenuLabel>{intl.formatMessage(verifyLabels[verify])}</MenuLabel>
			</MenuItem>

			<MenuSeparator />
		</>
	)
}

/**
 * The user menu item that signs out.
 *
 * @remarks Sign-out loads `/login` as a full page, so no data of the user stays
 * in the query cache.
 */
export function SignOutMenuItem() {
	const intl = useIntl()

	return (
		<MenuItem onAction={signOut}>
			<Icon icon={<LogOut />} />
			<MenuLabel>{intl.formatMessage(authMessages.signOut)}</MenuLabel>
		</MenuItem>
	)
}
