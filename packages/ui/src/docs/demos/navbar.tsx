'use client'

import { AtSign, Home, Info } from 'lucide-react'
import { useState } from 'react'
import { Area } from '../components/area'
import { Nav, NavContent, NavContents, NavItem, NavList, NavProvider } from '../../components/nav'
import { Navbar } from '../../components/navbar'
import { Spacer } from '../../components/spacer'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Navigation' }

function NavItems() {
	return (
		<NavList>
			<NavItem value="home">Home</NavItem>
			<NavItem value="about">About</NavItem>
			<NavItem value="contact">Contact</NavItem>
		</NavList>
	)
}

export default function NavbarDemo() {
	const [current, setCurrent] = useState('home')

	return (
		<Stack gap={8}>
			<Example title="Default">
				<Navbar variant="outline">
					<Nav value="home">
						<NavItems />
					</Nav>
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
					<Nav value="home">
						<NavItems />
					</Nav>
				</Navbar>

				<Navbar variant="plain">
					<Nav value="home">
						<NavItems />
					</Nav>
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

					<Area p={4}>
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

					<Area p={4}>
						<NavContents>
							<NavContent value="home">Home page</NavContent>
							<NavContent value="about">About us</NavContent>
							<NavContent value="contact">Contact information</NavContent>
						</NavContents>
					</Area>
				</NavProvider>
			</Example>

			<Example
				title="With icons"
				code={code`
				import { Navbar } from 'ui/navbar'
				import { NavList, NavItem } from 'ui/nav'
				import { Home, Info, AtSign } from 'lucide-react'

				<Navbar>
					<NavList>
						<NavItem value="home">
							<Home className="me-2" />
							Home
						</NavItem>
						<NavItem value="about">
							<Info className="me-2" />
							About
						</NavItem>
						<NavItem value="contact">
							<AtSign className="me-2" />
							Contact
						</NavItem>
					</NavList>
				</Navbar>
			`}
			>
				<Navbar>
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
				</Navbar>
			</Example>
		</Stack>
	)
}
