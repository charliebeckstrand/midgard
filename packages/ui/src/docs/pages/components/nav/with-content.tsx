import { Card } from 'ui/card'
import { Nav, NavContent, NavContents, NavItem, NavList } from 'ui/nav'

// `NavContents` is a direct child of `Nav`, so the panels render after the
// `<nav>` landmark.
export default function WithContent() {
	return (
		<Nav aria-label="Settings" defaultValue="account">
			<NavList orientation="horizontal">
				<NavItem value="account">Account</NavItem>
				<NavItem value="notifications">Notifications</NavItem>
				<NavItem value="billing">Billing</NavItem>
			</NavList>
			<NavContents>
				<Card>
					<NavContent value="account">Account settings</NavContent>
					<NavContent value="notifications">Notification preferences</NavContent>
					<NavContent value="billing">Billing information</NavContent>
				</Card>
			</NavContents>
		</Nav>
	)
}
