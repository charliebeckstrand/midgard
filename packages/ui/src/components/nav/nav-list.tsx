'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import { k } from '../../recipes/kata/nav'
import { useNavBar } from './context'

/** Props for {@link NavList}: an optional `orientation` plus native `<ul>` attributes. */
export type NavListProps = ComponentPropsWithoutRef<'ul'> & {
	/**
	 * Layout axis for the items.
	 * @defaultValue `'horizontal'` inside a {@link NavBar}, otherwise `'vertical'`
	 */
	orientation?: 'vertical' | 'horizontal'
}

/**
 * `<ul>` of navigation links; establishes an active-indicator scope so the
 * current item animates between siblings. Each link is individually
 * Tab-focusable (a link list, not a roving menubar) with the current one marked
 * `aria-current="page"`.
 */
export function NavList({ orientation, className, children, ...props }: NavListProps) {
	const inNavBar = useNavBar()

	const resolvedOrientation = orientation ?? (inNavBar ? 'horizontal' : 'vertical')

	// A `<ul>` of links inside the enclosing `<nav>` landmark. Each link is
	// individually Tab-focusable with the current one marked
	// `aria-current="page"`: a link list, not a roving-tabindex menubar. The
	// list element preserves count/position semantics; Tailwind preflight
	// zeroes its default margin/padding/marker.
	return (
		<ActiveIndicatorScope>
			<ul
				data-slot="nav-list"
				data-orientation={resolvedOrientation}
				className={cn(k.list.base, k.list.orientation[resolvedOrientation], className)}
				{...props}
			>
				{children}
			</ul>
		</ActiveIndicatorScope>
	)
}
