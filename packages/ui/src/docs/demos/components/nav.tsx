import { AtSign, Home, Info } from 'lucide-react'
import { useState } from 'react'
import { Card } from '../../../components/card'
import {
	NavBar,
	NavContent,
	NavContents,
	NavContext,
	NavItem,
	NavList,
} from '../../../components/nav'
import { Tab, TabContent, TabContents, TabList } from '../../../components/tabs'
import { Stack } from '../../../structure/stack'
import { Axes, Example, PageTabs } from '../../engine'

export function Demo() {
	const [current, setCurrent] = useState<string | null>('account')

	return (
		<PageTabs defaultValue="List">
			<TabList aria-label="Nav examples">
				<Tab value="List">List</Tab>
				<Tab value="Bar">Bar</Tab>
				<Tab value="Context">Context</Tab>
			</TabList>
			<TabContents>
				<TabContent value="List">
					<Stack gap="xl">
						<Axes
							of="NavList"
							render={(props) => (
								<NavList {...props}>
									<NavItem>Home</NavItem>
									<NavItem>About</NavItem>
									<NavItem>Contact</NavItem>
								</NavList>
							)}
						/>

						<Example title="With icons">
							<NavList orientation="horizontal">
								<NavItem icon={<Home />}>Home</NavItem>
								<NavItem icon={<Info />}>About</NavItem>
								<NavItem icon={<AtSign />}>Contact</NavItem>
							</NavList>
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Bar">
					<Stack gap="xl">
						<Axes
							of="NavBar"
							render={(props, label) => (
								// Each bar is a landmark, so each instance takes a unique name.
								<NavBar {...props} aria-label={label}>
									<NavList>
										<NavItem current>Home</NavItem>
										<NavItem>About</NavItem>
										<NavItem>Contact</NavItem>
									</NavList>
								</NavBar>
							)}
						/>
					</Stack>
				</TabContent>

				<TabContent value="Context">
					<Stack gap="xl">
						<Example title="With content">
							<NavContext value={{ value: current ?? undefined, onValueChange: setCurrent }}>
								<NavList orientation="horizontal">
									<NavItem value="account">Account</NavItem>
									<NavItem value="notifications">Notifications</NavItem>
									<NavItem value="billing">Billing</NavItem>
								</NavList>
								<Card bg="none">
									<NavContents>
										<NavContent value="account">Account settings</NavContent>
										<NavContent value="notifications">Notification preferences</NavContent>
										<NavContent value="billing">Billing information</NavContent>
									</NavContents>
								</Card>
							</NavContext>
						</Example>
					</Stack>
				</TabContent>
			</TabContents>
		</PageTabs>
	)
}
