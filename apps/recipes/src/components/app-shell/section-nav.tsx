'use client'

import { CalendarDays, CookingPot } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Icon } from 'ui/icon'
import { Nav, NavItem, NavList } from 'ui/nav'

/** The two sections, in the order the bar lists them. */
const SECTIONS = [
	{ href: '/', label: 'Recipes', icon: <CookingPot /> },
	{ href: '/rota', label: 'Rota', icon: <CalendarDays /> },
]

/**
 * Which section a path is in.
 *
 * Read by prefix rather than by equality, because a section is a subtree: the
 * recipe detail route is still Recipes, and the history calendar is still Rota.
 * The root is the exception, since every path starts with it.
 */
function sectionOf(pathname: string): string {
	return pathname.startsWith('/rota') ? '/rota' : '/'
}

/**
 * The switch between the two sections.
 *
 * Links rather than tabs. The two are routes, so a reader can open one in a new
 * window, send it to someone, and walk back out of it — none of which a tablist
 * offers, and all of which they will expect from something that changes the
 * address.
 *
 * It reads the path rather than taking a prop, because there is one right answer
 * and the page it sits above already navigated to it.
 */
export function SectionNav() {
	const section = sectionOf(usePathname())

	return (
		<Nav aria-label="Sections">
			<NavList orientation="horizontal">
				{SECTIONS.map(({ href, label, icon }) => (
					<NavItem key={href} href={href} current={href === section} icon={<Icon icon={icon} />}>
						{label}
					</NavItem>
				))}
			</NavList>
		</Nav>
	)
}
