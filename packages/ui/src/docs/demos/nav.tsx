'use client'

import { useState } from 'react'
import { Card } from '../../components/card'
import { NavContent, NavContents, NavContext, NavItem, NavList } from '../../components/nav'
import { Example } from '../components/example'

export const meta = { category: 'Navigation' }

export function Demo() {
	const [current, setCurrent] = useState('account')

	return (
		<>
			<Example title="Default">
				<NavList orientation="horizontal">
					<NavItem value="home">Home</NavItem>
					<NavItem value="about">About</NavItem>
					<NavItem value="contact">Contact</NavItem>
				</NavList>
			</Example>

			<Example title="Value model with content">
				<NavContext value={{ value: current, onChange: setCurrent }}>
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

			<Example title="With links">
				<NavList>
					<NavItem current>Dashboard</NavItem>
					<NavItem href="#settings">Settings</NavItem>
					<NavItem href="#docs">Documentation</NavItem>
				</NavList>
			</Example>
		</>
	)
}
