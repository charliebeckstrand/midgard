'use client'

import { Home, MessageCircle, Search, Settings, User } from 'lucide-react'
import { useState } from 'react'
import { BottomNav, BottomNavItem } from '../../components/bottom-nav'
import { Card } from '../../components/card'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Navigation' }

const items = [
	{ value: 'home', label: 'Home', icon: <Home />, iconName: 'Home' },
	{ value: 'search', label: 'Search', icon: <Search />, iconName: 'Search' },
	{ value: 'messages', label: 'Messages', icon: <MessageCircle />, iconName: 'MessageCircle' },
	{ value: 'profile', label: 'Profile', icon: <User />, iconName: 'User' },
	{ value: 'settings', label: 'Settings', icon: <Settings />, iconName: 'Settings' },
]

function BottomNavExample() {
	const [active, setActive] = useState('home')

	return (
		<Card bg="none" className="relative">
			<BottomNav value={active} onChange={setActive}>
				{items.map(({ value, label, icon }) => (
					<BottomNavItem key={value} value={value} icon={icon}>
						{label}
					</BottomNavItem>
				))}
			</BottomNav>
		</Card>
	)
}

function WithLinksExample() {
	return (
		<Card bg="none" className="relative">
			<BottomNav>
				<BottomNavItem icon={<Home />} href="/" current>
					Home
				</BottomNavItem>
				<BottomNavItem icon={<Search />} href="/search">
					Search
				</BottomNavItem>
				<BottomNavItem icon={<User />} href="/profile">
					Profile
				</BottomNavItem>
			</BottomNav>
		</Card>
	)
}

export default function BottomNavDemo() {
	return (
		<Stack gap="xl">
			<Example
				title="Default"
				code={code`
					import { BottomNav, BottomNavItem } from 'ui/bottom-nav'
					import { Home, Search, MessageCircle, User, Settings } from 'lucide-react'

					<BottomNav value={active} onChange={setActive}>
					${items.map(({ value, label, iconName }) => `  <BottomNavItem value="${value}" icon={<${iconName} />}>${label}</BottomNavItem>`)}
					</BottomNav>
				`}
			>
				<BottomNavExample />
			</Example>

			<Example title="With links">
				<WithLinksExample />
			</Example>
		</Stack>
	)
}
