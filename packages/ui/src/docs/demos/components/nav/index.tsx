import { AtSign, Home, Info } from 'lucide-react'
import { NavItem, NavList } from '../../../../components/nav'
import { Stack } from '../../../../components/stack'
import { Example } from '../../../engine'

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Horizontal">
				<NavList orientation="horizontal">
					<NavItem>Home</NavItem>
					<NavItem>About</NavItem>
					<NavItem>Contact</NavItem>
				</NavList>
			</Example>

			<Example title="Vertical">
				<NavList orientation="vertical">
					<NavItem>Home</NavItem>
					<NavItem>About</NavItem>
					<NavItem>Contact</NavItem>
				</NavList>
			</Example>

			<Example title="With icons">
				<NavList orientation="horizontal">
					<NavItem icon={<Home />}>Home</NavItem>
					<NavItem icon={<Info />}>About</NavItem>
					<NavItem icon={<AtSign />}>Contact</NavItem>
				</NavList>
			</Example>
		</Stack>
	)
}
