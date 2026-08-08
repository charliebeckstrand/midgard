'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import { k, type NavBarVariants } from '../../recipes/kata/nav'
import { NavBarContext } from './context'

/** Props for {@link NavBar}: recipe `variant` plus native `<nav>` attributes. */
export type NavBarProps = NavBarVariants & ComponentPropsWithoutRef<'nav'>

/**
 * Horizontal top-level navigation landmark; establishes an active-indicator
 * scope for its child items.
 *
 * @remarks
 * That scope resolves nothing in any valid composition today: the only
 * `ActiveIndicator` is `NavItem`, which always sits inside a `NavList` that
 * opens a nearer scope of its own. It stays because this doc promises it —
 * dropping it is a contract change, not a cleanup. Pagination is the clean
 * contrast: only its list opens a scope.
 */
export function NavBar({
	variant = 'solid',
	'aria-label': ariaLabel = 'Main',
	className,
	children,
	...props
}: NavBarProps) {
	return (
		<NavBarContext value={true}>
			<ActiveIndicatorScope>
				<nav
					data-slot="nav-bar"
					aria-label={ariaLabel}
					className={cn(k.bar({ variant }), className)}
					{...props}
				>
					{children}
				</nav>
			</ActiveIndicatorScope>
		</NavBarContext>
	)
}
