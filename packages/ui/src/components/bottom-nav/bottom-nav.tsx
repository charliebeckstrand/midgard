import { cn } from '../../core'
import { k } from '../../recipes/kata/bottom-nav'
import { Nav, NavList, type NavProps } from '../nav'

export type BottomNavProps = NavProps

/** Fixed bottom navigation bar — Nav wrapping a horizontal NavList for mobile-style tab destinations. */
export function BottomNav({
	'aria-label': ariaLabel = 'Bottom',
	children,
	...props
}: BottomNavProps) {
	// `className` rides along in `props` to the `<nav>` it is typed for; the
	// bar styling stays on the inner list.
	return (
		<Nav aria-label={ariaLabel} {...props}>
			<NavList orientation="horizontal" className={cn(k.base)}>
				{children}
			</NavList>
		</Nav>
	)
}
