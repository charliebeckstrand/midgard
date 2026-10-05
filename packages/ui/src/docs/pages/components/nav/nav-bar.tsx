import { NavBar, NavItem, NavList } from 'ui/nav'

const variants = ['solid', 'outline', 'plain'] as const

export default function NavBarExample() {
	return (
		<>
			{variants.map((variant) => (
				<NavBar key={variant} variant={variant} aria-label={variant}>
					<NavList>
						<NavItem current>Home</NavItem>
						<NavItem>About</NavItem>
						<NavItem>Contact</NavItem>
					</NavList>
				</NavBar>
			))}
		</>
	)
}
