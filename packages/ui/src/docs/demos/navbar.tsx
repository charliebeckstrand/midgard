import { AtSign, Home, Info } from 'lucide-react'
import { useState } from 'react'
import { Card } from '../../components/card'
import { Nav, NavContent, NavContents, NavContext, NavItem, NavList } from '../../components/nav'
import { Navbar } from '../../components/navbar'
import { Spacer } from '../../components/spacer'
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

function NavProviderDemo() {
	const [current, setCurrent] = useState<string | undefined>('home')

	return (
		<NavContext value={{ value: current, onValueChange: setCurrent }}>
			<Navbar>
				<NavItems />
				<Spacer />
				<NavList>
					<NavItem>Login</NavItem>
				</NavList>
			</Navbar>

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
	return (
		<>
			<Example title="Default">
				<Navbar variant="outline">
					<Nav value="home">
						<NavItems />
					</Nav>
				</Navbar>
			</Example>

			<Example title="Variants">
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

			<Example title="With NavContext">
				<NavProviderDemo />
			</Example>

			<Example title="With icons">
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
		</>
	)
}
