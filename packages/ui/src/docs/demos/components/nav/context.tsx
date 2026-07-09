import { useState } from 'react'
import { Card } from '../../../../components/card'
import { NavContent, NavContents, NavContext, NavItem, NavList } from '../../../../components/nav'
import { Stack } from '../../../../components/stack'
import { Example } from '../../../engine'

export function Demo() {
	const [current, setCurrent] = useState<string | undefined>('account')

	return (
		<Stack gap="xl">
			<Example title="With content">
				<NavContext value={{ value: current, onValueChange: setCurrent }}>
					<NavList orientation="horizontal">
						<NavItem value="account">Account</NavItem>
						<NavItem value="notifications">Notifications</NavItem>
						<NavItem value="billing">Billing</NavItem>
					</NavList>
					<Card bg="none" p="lg">
						<NavContents>
							<NavContent value="account">Account settings</NavContent>
							<NavContent value="notifications">Notification preferences</NavContent>
							<NavContent value="billing">Billing information</NavContent>
						</NavContents>
					</Card>
				</NavContext>
			</Example>
		</Stack>
	)
}
