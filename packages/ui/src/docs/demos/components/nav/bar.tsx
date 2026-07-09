import { Nav, NavBar, NavItem, NavList } from '../../../../components/nav'
import { Stack } from '../../../../components/stack'
import { Example } from '../../../engine'

function NavItems() {
	return (
		<NavList>
			<NavItem value="home">Home</NavItem>
			<NavItem value="about">About</NavItem>
			<NavItem value="contact">Contact</NavItem>
		</NavList>
	)
}

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Variants">
				<NavBar variant="solid">
					<Nav value="home">
						<NavItems />
					</Nav>
				</NavBar>

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
		</Stack>
	)
}
