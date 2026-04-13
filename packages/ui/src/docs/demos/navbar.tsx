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
			<NavItem value="home" icon={<HomeIcon />}>
				Home
			</NavItem>
			<NavItem value="about" icon={<InfoIcon />}>
				About
			</NavItem>
			<NavItem value="contact" icon={<AtSignIcon />}>
				Contact
			</NavItem>
		</NavList>
	)
}

export default function NavbarDemo() {
	const [defaultCurrent, setDefaultCurrent] = useState('home')
	const [solidCurrent, setSolidCurrent] = useState('home')
	const [softCurrent, setSoftCurrent] = useState('home')
	const [outlineCurrent, setOutlineCurrent] = useState('home')
	const [plainCurrent, setPlainCurrent] = useState('home')

	return (
		<div className="space-y-8">
			<Example
				title="Default"
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
				<NavProvider value={{ value: defaultCurrent, onChange: setDefaultCurrent }}>
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

			<Example
				title="Variants"
				code={code`
					import { Navbar } from 'ui/navbar'

					<Navbar variant="solid">
						...content
					</Navbar>
					<Navbar variant="soft">
						...content
					</Navbar>
					<Navbar variant="outline">
						...content
					</Navbar>
					<Navbar variant="plain">
						...content
					</Navbar>
				`}
			>
				<NavProvider value={{ value: solidCurrent, onChange: setSolidCurrent }}>
					<Navbar variant="solid">
						<NavItems />
					</Navbar>
				</NavProvider>
				<NavProvider value={{ value: softCurrent, onChange: setSoftCurrent }}>
					<Navbar variant="soft">
						<NavItems />
					</Navbar>
				</NavProvider>
				<NavProvider value={{ value: outlineCurrent, onChange: setOutlineCurrent }}>
					<Navbar variant="outline">
						<NavItems />
					</Navbar>
				</NavProvider>
				<NavProvider value={{ value: plainCurrent, onChange: setPlainCurrent }}>
					<Navbar variant="plain">
						<NavItems />
					</Navbar>
				</NavProvider>
			</Example>
		</div>
	)
}
