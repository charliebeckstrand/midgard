'use client'

import type { User } from 'auth'
import { CircleUserRound, LogOut, MailCheck, MapPinned, Plus } from 'lucide-react'
import { useState } from 'react'
import { sendVerificationEmail, signOut } from 'shared/auth'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import {
	Menu,
	MenuContent,
	MenuHeading,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuSeparator,
	MenuTrigger,
} from 'ui/menu'

type UserMenuProps = {
	user: User
	/** The number of places that the list opens on, or `undefined` to show no count. */
	count?: number
	onAdd: () => void
	/** Opens the list. Without it, the menu has no list item. */
	onList?: () => void
}

/** Where sending a verification link stands, and the label it shows. */
const verifyLabels = {
	idle: 'Verify your email',
	sent: 'Link sent, check your email',
	failed: 'Link not sent, try again later',
} as const

/**
 * The menu of the signed-in user: add a place, open the list, and sign out. A
 * user whose email is not verified can also send a verification link, since
 * places can't be changed until it is.
 *
 * @remarks Sign-out and the link are `signOut` and `sendVerificationEmail` from
 * `shared/auth`. Sign-out loads `/login` as a full page, so no data of the user
 * stays in the query cache.
 */
export function UserMenu({ user, count, onAdd, onList }: UserMenuProps) {
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

			<MenuContent>
				<MenuSection>
					<MenuHeading>{user.email}</MenuHeading>

					<MenuItem onAction={onAdd}>
						<Icon icon={<Plus />} />
						<MenuLabel>Add place</MenuLabel>
					</MenuItem>

					{onList === undefined ? null : (
						<MenuItem onAction={onList}>
							<Icon icon={<MapPinned />} />
							<MenuLabel>{count === undefined ? 'My places' : `My places (${count})`}</MenuLabel>
						</MenuItem>
					)}
				</MenuSection>

				{user.is_verified ? null : (
					<>
						<MenuSeparator />

						<MenuItem
							onAction={sendVerification}
							disabled={verify === 'sent'}
							closeOnAction={false}
						>
							<Icon icon={<MailCheck />} />
							<MenuLabel>{verifyLabels[verify]}</MenuLabel>
						</MenuItem>
					</>
				)}

				<MenuSeparator />

				<MenuItem onAction={signOut}>
					<Icon icon={<LogOut />} />
					<MenuLabel>Sign out</MenuLabel>
				</MenuItem>
			</MenuContent>
		</Menu>
	)
}
