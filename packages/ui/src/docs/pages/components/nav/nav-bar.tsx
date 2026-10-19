import { NavBar, NavItem, NavList } from 'ui/nav'

const bars = [
	{ variant: 'solid', label: 'Main' },
	{ variant: 'outline', label: 'Secondary' },
	{ variant: 'plain', label: 'Footer' },
] as const

export default function NavBarExample() {
	return (
		<>
			{bars.map(({ variant, label }) => (
				<NavBar key={variant} variant={variant} aria-label={label}>
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
