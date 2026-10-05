import { NavItem, NavList, type NavListProps } from 'ui/nav'

export default function NavPlayground(props: NavListProps) {
	return (
		<NavList {...props}>
			<NavItem>Home</NavItem>
			<NavItem>About</NavItem>
			<NavItem>Contact</NavItem>
		</NavList>
	)
}
