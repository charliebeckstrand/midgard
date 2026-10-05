import { AtSign, House, Info } from 'lucide-react'
import { NavItem, NavList } from 'ui/nav'

export default function WithIcons() {
	return (
		<NavList orientation="horizontal">
			<NavItem icon={<House />}>Home</NavItem>
			<NavItem icon={<Info />}>About</NavItem>
			<NavItem icon={<AtSign />}>Contact</NavItem>
		</NavList>
	)
}
