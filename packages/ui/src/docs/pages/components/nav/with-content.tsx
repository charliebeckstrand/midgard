import { Nav, NavContent, NavContents, NavItem, NavList } from 'ui/nav'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

// `NavContents` is a direct child of `Nav`, so the panels render after the
// `<nav>` landmark. The stack puts its gap between the two.
export default function WithContent() {
	return (
		<Stack gap="lg">
			<Nav aria-label="Settings" defaultValue="account">
				<NavList orientation="horizontal">
					<NavItem value="account">Account</NavItem>
					<NavItem value="notifications">Notifications</NavItem>
					<NavItem value="billing">Billing</NavItem>
				</NavList>
				<NavContents>
					<NavContent value="account">
						<Text tone="muted">Signed in as wade@example.com</Text>
					</NavContent>
					<NavContent value="notifications">
						<Text tone="muted">You get an email for each new comment.</Text>
					</NavContent>
					<NavContent value="billing">
						<Text tone="muted">Team plan, renews on July 1</Text>
					</NavContent>
				</NavContents>
			</Nav>
		</Stack>
	)
}
