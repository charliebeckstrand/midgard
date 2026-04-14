'use client'

import { useState } from 'react'
import { Area } from '../../components/area'
import { NavContent, NavContents, NavItem, NavList, NavProvider } from '../../components/nav'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Navigation' }

export default function NavDemo() {
	const [current, setCurrent] = useState('account')

	return (
		<Stack gap={8}>
			<Example title="Default">
				<Sizer>
					<NavList orientation="horizontal">
						<NavItem value="home">Home</NavItem>
						<NavItem value="about">About</NavItem>
						<NavItem value="contact">Contact</NavItem>
					</NavList>
				</Sizer>
			</Example>
			<Example
				title="Value model with content"
				code={code`
				import { Nav, NavList, NavItem, NavContent, NavContents, NavProvider } from 'ui/nav'

				const [current, setCurrent] = useState('Account')
				
				<NavProvider value={{ value: current, onChange: setCurrent }}>
					<Navbar>
						<NavList orientation="horizontal">
							<NavItem value="account">Account</NavItem>
							<NavItem value="notifications">Notifications</NavItem>
							<NavItem value="billing">Billing</NavItem>
						</NavList>
					</Navbar>
					<Area>
						<NavContents>
							<NavContent value="account">Account settings</NavContent>
							<NavContent value="notifications">Notification preferences</NavContent>
							<NavContent value="billing">Billing information</NavContent>
						</NavContents>
					</Area>
				</NavProvider>
			`}
			>
				<Sizer>
					<NavProvider value={{ value: current, onChange: setCurrent }}>
						<NavList orientation="horizontal">
							<NavItem value="account">Account</NavItem>
							<NavItem value="notifications">Notifications</NavItem>
							<NavItem value="billing">Billing</NavItem>
						</NavList>
						<Area>
							<NavContents>
								<NavContent value="account">Account settings</NavContent>
								<NavContent value="notifications">Notification preferences</NavContent>
								<NavContent value="billing">Billing information</NavContent>
							</NavContents>
						</Area>
					</NavProvider>
				</Sizer>
			</Example>

			<Example title="With links">
				<Sizer>
					<NavList>
						<NavItem current>Dashboard</NavItem>
						<NavItem href="#settings">Settings</NavItem>
						<NavItem href="#docs">Documentation</NavItem>
					</NavList>
				</Sizer>
			</Example>
		</Stack>
	)
}
