import { NavItem, NavList } from 'ui/nav'

// An item with an `href` is current when it matches the `pathname` of
// `UIProvider`, so Nav is current on this page. Set `match="prefix"` on the
// item of a section root, so it stays current on each page under it.
export default function Links() {
	return (
		<NavList orientation="horizontal">
			<NavItem href="/menu">Menu</NavItem>
			<NavItem href="/nav">Nav</NavItem>
			<NavItem href="/sidebar">Sidebar</NavItem>
		</NavList>
	)
}
