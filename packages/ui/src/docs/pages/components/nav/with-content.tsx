import { useState } from 'react'
import { Card } from 'ui/card'
import { NavContent, NavContents, NavContext, NavItem, NavList } from 'ui/nav'

export default function WithContent() {
	const [current, setCurrent] = useState<string | null>('account')

	return (
		<NavContext value={{ value: current, onValueChange: setCurrent }}>
			<NavList orientation="horizontal">
				<NavItem value="account">Account</NavItem>
				<NavItem value="notifications">Notifications</NavItem>
				<NavItem value="billing">Billing</NavItem>
			</NavList>
			<Card>
				<NavContents>
					<NavContent value="account">Account settings</NavContent>
					<NavContent value="notifications">Notification preferences</NavContent>
					<NavContent value="billing">Billing information</NavContent>
				</NavContents>
			</Card>
		</NavContext>
	)
}
