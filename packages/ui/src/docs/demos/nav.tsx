'use client'

import { useState } from 'react'
import { Nav, NavContent, NavItem, NavItemContent, NavList } from '../../components/nav'
import { Example } from '../components/example'

export const meta = { category: 'Navigation' }

export default function NavDemo() {
	const [current, setCurrent] = useState('account')

	return (
		<div className="space-y-8">
			<Example title="Value model with content">
				<div className="flex gap-8">
					<Nav value={current} onChange={setCurrent}>
						<NavList>
							<NavItem value="account">Account</NavItem>
							<NavItem value="notifications">Notifications</NavItem>
							<NavItem value="billing">Billing</NavItem>
						</NavList>
					</Nav>
					<NavContent className="flex-1 text-sm text-zinc-500">
						<NavItemContent value="account">
							Account settings would go here.
						</NavItemContent>
						<NavItemContent value="notifications">
							Notification preferences would go here.
						</NavItemContent>
						<NavItemContent value="billing">
							Billing information would go here.
						</NavItemContent>
					</NavContent>
				</div>
			</Example>

			<Example title="With links">
				<Nav>
					<NavList>
						<NavItem current>Dashboard</NavItem>
						<NavItem href="#settings">Settings</NavItem>
						<NavItem href="#docs">Documentation</NavItem>
					</NavList>
				</Nav>
			</Example>
		</div>
	)
}
