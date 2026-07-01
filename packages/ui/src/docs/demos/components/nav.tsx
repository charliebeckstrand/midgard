import { AtSign, Home, Info } from 'lucide-react'
import { useState } from 'react'
import { Card } from '../../../components/card'
import {
	Nav,
	NavBar,
	NavContent,
	NavContents,
	NavContext,
	NavItem,
	NavList,
} from '../../../components/nav'
import { Stack } from '../../../components/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../components/tabs'
import { Example } from '../../engine'

function NavItems() {
	return (
		<NavList>
			<NavItem value="home">Home</NavItem>
			<NavItem value="about">About</NavItem>
			<NavItem value="contact">Contact</NavItem>
		</NavList>
	)
}

export function Demo() {
	const [current, setCurrent] = useState<string | undefined>('account')

	return (
		<Tabs defaultValue="List">
			<TabList aria-label="Nav examples">
				<Tab value="List">List</Tab>
				<Tab value="Bar">Bar</Tab>
				<Tab value="Context">Context</Tab>
			</TabList>
			<TabContents>
				<TabContent value="List">
					<Stack gap="xl">
						<Example title="Horizontal">
							<NavList orientation="horizontal">
								<NavItem>Home</NavItem>
								<NavItem>About</NavItem>
								<NavItem>Contact</NavItem>
							</NavList>
						</Example>

						<Example title="Vertical">
							<NavList orientation="vertical">
								<NavItem>Home</NavItem>
								<NavItem>About</NavItem>
								<NavItem>Contact</NavItem>
							</NavList>
						</Example>

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
						<Example title="Variants">
							<NavBar variant="solid">
								<Nav value="home">
									<NavItems />
								</Nav>
							</NavBar>

							<NavBar variant="outline">
								<Nav value="home">
									<NavItems />
								</Nav>
							</NavBar>

							<NavBar variant="plain">
								<Nav value="home">
									<NavItems />
								</Nav>
							</NavBar>
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Context">
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
				</TabContent>
			</TabContents>
		</Tabs>
	)
}
