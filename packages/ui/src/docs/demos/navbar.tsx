import {
	Navbar,
	NavbarItem,
	NavbarLabel,
	NavbarSection,
	NavbarSpacer,
} from '../../components/navbar'
import { Example } from '../example'

export const meta = { category: 'Navigation' }

export default function NavbarDemo() {
	return (
		<Example>
			<Navbar className="rounded-lg border border-zinc-950/10 dark:border-white/10">
				<NavbarSection>
					<NavbarItem href="#navbar" current>
						<NavbarLabel>Dashboard</NavbarLabel>
					</NavbarItem>
					<NavbarItem href="#navbar">
						<NavbarLabel>Projects</NavbarLabel>
					</NavbarItem>
					<NavbarItem href="#navbar">
						<NavbarLabel>Settings</NavbarLabel>
					</NavbarItem>
				</NavbarSection>
				<NavbarSpacer />
				<NavbarSection>
					<NavbarItem href="#navbar">
						<NavbarLabel>Profile</NavbarLabel>
					</NavbarItem>
				</NavbarSection>
			</Navbar>
		</Example>
	)
}
