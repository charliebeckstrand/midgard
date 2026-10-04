'use client'

import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { useScrollOverflow } from '../../hooks'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import { k, type NavBarVariants } from '../../recipes/kata/nav'
import { NavBarContext } from './context'

/** Props for {@link NavBar}: recipe `variant` plus native `<nav>` attributes. */
export type NavBarProps = NavBarVariants & ComponentProps<'nav'>

/**
 * Horizontal top-level navigation landmark; establishes an active-indicator
 * scope for its child items. The items scroll in a row inside the frame. While
 * they overflow, the edge with more items behind it fades.
 *
 * @remarks
 * That scope resolves nothing in any valid composition today. The only
 * `ActiveIndicator` is `NavItem`, which always sits inside a `NavList` that
 * opens a nearer scope of its own. It stays because this doc promises it.
 * Dropping it is a contract change, not a cleanup. Pagination is the clean
 * contrast: only its list opens a scope.
 */
export function NavBar({
	variant = 'solid',
	'aria-label': ariaLabel = 'Main',
	className,
	children,
	...props
}: NavBarProps) {
	const scrollOverflowRef = useScrollOverflow({ axis: 'horizontal' })

	return (
		<NavBarContext value={true}>
			<ActiveIndicatorScope>
				<nav
					data-slot="nav-bar"
					aria-label={ariaLabel}
					className={cn(k.bar({ variant }), className)}
					{...props}
				>
					<div ref={scrollOverflowRef} data-slot="nav-bar-rail" className={cn(k.barRail)}>
						{children}
					</div>
				</nav>
			</ActiveIndicatorScope>
		</NavBarContext>
	)
}
