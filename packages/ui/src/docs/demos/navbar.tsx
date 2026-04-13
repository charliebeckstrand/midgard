'use client'

import { AtSignIcon, HomeIcon, InfoIcon } from 'lucide-react'
import { useState } from 'react'
import { Area } from '../../components/area'
import { NavContent, NavContents, NavItem, NavList, NavProvider } from '../../components/nav'
import { Navbar } from '../../components/navbar'
import { Spacer } from '../../components/spacer'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Navigation' }

function NavItems() {
	return (
		<NavList>
			<NavItem value="home" current>
				Home
			</NavItem>
			<NavItem value="about">About</NavItem>
			<NavItem value="contact">Contact</NavItem>
		</NavList>
	)
}

export default function NavbarDemo() {
	const [current, setCurrent] = useState('home')

	return (
		<div className="space-y-8">
			<Example title="Default">
				<Navbar variant="outline">
					<NavItems />
				</Navbar>
			</Example>

			<Example
				title="Variants"
				code={code`
					import { Navbar } from 'ui/navbar'

					<Navbar variant="outline">
						...content
					</Navbar>
					<Navbar variant="plain">
						...content
					</Navbar>
				`}
			>
				<Navbar variant="outline">
					<NavItems />
				</Navbar>
				<Navbar variant="plain">
					<NavItems />
				</Navbar>
			</Example>

			<Example
				title="With NavProvider"
				code={code`
				import { Nav, NavList, NavItem, NavContent, NavContents, NavProvider } from 'ui/nav'
				import { Navbar } from 'ui/navbar'

				const [current, setCurrent] = useState('home')

				<NavProvider value={{ value: current, onChange: setCurrent }}>
					<Navbar>
						<NavList>
							<NavItem value="home">Home</NavItem>
							<NavItem value="about">About</NavItem>
							<NavItem value="contact">Contact</NavItem>
						</NavList>
						<Spacer />
						<NavList>
							<NavItem>Login</NavItem>
						</NavList>
					</Navbar>

					<Area>
						<NavContents>
							<NavContent value="home">Home page</NavContent>
							<NavContent value="about">About us</NavContent>
							<NavContent value="contact">Contact information</NavContent>
						</NavContents>
					</Area>
				</NavProvider>
			`}
			>
				<NavProvider value={{ value: current, onChange: setCurrent }}>
					<Navbar>
						<NavItems />
						<Spacer />
						<NavList>
							<NavItem>Login</NavItem>
						</NavList>
					</Navbar>

					<Area>
						<NavContents>
							<NavContent value="home">Home page</NavContent>
							<NavContent value="about">About us</NavContent>
							<NavContent value="contact">Contact information</NavContent>
						</NavContents>
					</Area>
				</NavProvider>
			</Example>
		</div>
	)
}
