'use client'

import type { User } from 'auth'
import { CircleUserRound, LogOut, MailCheck, MapPinned, Plus } from 'lucide-react'
import { useState } from 'react'
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
 * @remarks Sign-out POSTs `/auth/logout`, then loads `/login`. The link is sent
 * with `POST /auth/verify-email`.
 */
export function UserMenu({ user, count, onAdd, onList }: UserMenuProps) {
	const [verify, setVerify] = useState<keyof typeof verifyLabels>('idle')

	async function sendVerification() {
		const response = await fetch('/auth/verify-email', { method: 'POST' }).catch(() => null)

		setVerify(response?.ok ? 'sent' : 'failed')
	}
	async function signOut() {
		await fetch('/auth/logout', { method: 'POST' }).catch(() => {})

		// A full load, so no data of the user stays in the query cache.
		window.location.assign('/login')
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
