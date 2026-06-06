import { cn } from '../../core'
import { k } from '../../recipes/kata/bottom-nav'
import { Nav, NavList, type NavProps } from '../nav'

export type BottomNavProps = NavProps

/** Fixed bottom navigation bar — Nav wrapping a horizontal NavList for mobile-style tab destinations. */
export function BottomNav({ className, children, ...props }: BottomNavProps) {
	return (
		<Nav {...props}>
			<NavList orientation="horizontal" className={cn(k.base, className)}>
				{children}
			</NavList>
		</Nav>
	)
}
