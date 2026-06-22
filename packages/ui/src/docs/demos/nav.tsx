import { AtSign, Home, Info } from 'lucide-react'
import { useState } from 'react'
import { Card } from '../../components/card'
import {
	Nav,
	NavBar,
	NavContent,
	NavContents,
	NavContext,
	NavItem,
	NavList,
} from '../../components/nav'
import { Spacer } from '../../components/spacer'
import { Stack } from '../../components/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../components/tabs'
import { Example } from '../components/example'

function NavItems() {
	return (
		<NavList>
			<NavItem value="home">Home</NavItem>
			<NavItem value="about">About</NavItem>
			<NavItem value="contact">Contact</NavItem>
		</NavList>
	)
}

function NavProviderDemo() {
	const [current, setCurrent] = useState<string | undefined>('home')

	return (
		<NavContext value={{ value: current, onValueChange: setCurrent }}>
			<NavBar>
				<NavItems />
				<Spacer />
				<NavList>
					<NavItem>Login</NavItem>
				</NavList>
			</NavBar>

			<Card bg="surface">
				<NavContents>
					<NavContent value="home">Home page</NavContent>
					<NavContent value="about">About us</NavContent>
					<NavContent value="contact">Contact information</NavContent>
				</NavContents>
			</Card>
		</NavContext>
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
						<Example title="Default">
							<NavList orientation="horizontal">
								<NavItem value="home">Home</NavItem>
								<NavItem value="about">About</NavItem>
								<NavItem value="contact">Contact</NavItem>
							</NavList>
						</Example>

						<Example title="With links">
							<NavList>
								<NavItem current>Dashboard</NavItem>
								<NavItem href="#settings">Settings</NavItem>
								<NavItem href="#docs">Documentation</NavItem>
							</NavList>
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Bar">
					<Stack gap="xl">
						<Example title="Default">
							<NavBar variant="outline">
								<Nav value="home">
									<NavItems />
								</Nav>
							</NavBar>
						</Example>

						<Example title="Variants">
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

						<Example title="With icons">
							<NavBar>
								<NavList>
									<NavItem value="home" icon={<Home />}>
										Home
									</NavItem>
									<NavItem value="about" icon={<Info />}>
										About
									</NavItem>
									<NavItem value="contact" icon={<AtSign />}>
										Contact
									</NavItem>
								</NavList>
							</NavBar>
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Context">
					<Stack gap="xl">
						<Example title="Value model with content">
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

						<Example title="Within a NavBar">
							<NavProviderDemo />
						</Example>
					</Stack>
				</TabContent>
			</TabContents>
		</Tabs>
	)
}
