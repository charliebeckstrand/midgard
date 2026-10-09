'use client'

import type { User } from 'auth'
import { CircleUserRound } from 'lucide-react'
import { SignOutMenuItem, VerifyEmailMenuItem } from 'shared/auth'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuTrigger } from 'ui/menu'

/**
 * The menu of the signed-in user: sign out, and send a verification link when
 * the email is not verified. The heading is the name of the user, with the
 * email below it. A user with no name gets the email as the heading.
 *
 * @remarks The items are `VerifyEmailMenuItem` and `SignOutMenuItem` from
 * `shared/auth`.
 */
export function UserMenu({ user }: { user: User }) {
	return (
		<Menu placement="bottom-end">
			<MenuTrigger>
				<Button variant="plain" aria-label="User menu">
					<Icon icon={<CircleUserRound />} />
				</Button>
			</MenuTrigger>

			<MenuContent title={user.name ?? user.email} description={user.name ? user.email : undefined}>
				<VerifyEmailMenuItem user={user} />

				<SignOutMenuItem />
			</MenuContent>
		</Menu>
	)
}
