'use client'

import { useState } from 'react'
import { Nav, NavContent, NavItem, NavList } from '../../components/nav'
import { Example } from '../components/example'

export const meta = { category: 'Navigation' }

const items = ['Account', 'Notifications', 'Billing']

export default function NavDemo() {
	const [current, setCurrent] = useState('Account')

	return (
		<div className="space-y-8">
			<Example title="Default">
				<div className="flex gap-8">
					<Nav>
						<NavList>
							{items.map((item) => (
								<NavItem
									key={item}
									current={current === item}
									onClick={() => setCurrent(item)}
								>
									{item}
								</NavItem>
							))}
						</NavList>
					</Nav>
					<NavContent className="flex-1 text-sm text-zinc-500">
						{current} settings would go here.
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
