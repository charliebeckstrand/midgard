export { NavContext, type NavContextValue, useNavContext } from './context'
export {
	Nav,
	type NavProps,
} from './nav'
export {
	NavContent,
	type NavContentProps,
	NavContents,
	type NavContentsProps,
} from './nav-content'
export {
	NavItem,
	type NavMenuItemProps,
} from './nav-item'
export {
	NavList,
	type NavListProps,
} from './nav-list'
// `useNavItem` is the shared behavior hook for nav-item-style components;
// SidebarItem reaches for it across the barrel (CONVENTIONS §3). `NavItemProps`
// is the canonical base type — the Nav family's `<NavItem>` extends it with
// `value` in `NavMenuItemProps`, SidebarItem with `size`.
export {
	type NavItemProps,
	useNavItem,
} from './use-nav-item'
