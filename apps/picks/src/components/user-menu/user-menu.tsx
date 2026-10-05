'use client'

import type { User } from 'auth'
import { CircleUserRound, LogOut, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { sendVerificationEmail, signOut } from 'shared/auth'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from 'ui/menu'

/** Where sending a verification link stands, and the label it shows. */
const verifyLabels = {
	idle: 'Verify your email',
	sent: 'Link sent, check your email',
	failed: 'Link not sent, try again later',
} as const

/**
 * The menu of the signed-in user: sign out, and send a verification link when
 * the email is not verified. The heading is the name of the user, with the
 * email below it. A user with no name gets the email as the heading.
 *
 * @remarks Sign-out loads `/login` as a full page, so no data of the user stays
 * in the query cache.
 */
export function UserMenu({ user }: { user: User }) {
	const [verify, setVerify] = useState<keyof typeof verifyLabels>('idle')

	function sendVerification() {
		sendVerificationEmail().then(
			() => setVerify('sent'),
			() => setVerify('failed'),
		)
	}

	return (
		<Menu placement="bottom-end">
			<MenuTrigger>
				<Button variant="plain" aria-label="User menu">
					<Icon icon={<CircleUserRound />} />
				</Button>
			</MenuTrigger>

			<MenuContent title={user.name ?? user.email} description={user.name ? user.email : undefined}>
				{user.is_verified ? null : (
					<>
						<MenuItem
							onAction={sendVerification}
							disabled={verify === 'sent'}
							closeOnAction={false}
						>
							<Icon icon={<MailCheck />} />
							<MenuLabel>{verifyLabels[verify]}</MenuLabel>
						</MenuItem>

						<MenuSeparator />
					</>
				)}

				<MenuItem onAction={signOut}>
					<Icon icon={<LogOut />} />
					<MenuLabel>Sign out</MenuLabel>
				</MenuItem>
			</MenuContent>
		</Menu>
	)
}
