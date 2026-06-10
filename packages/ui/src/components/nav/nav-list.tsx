'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import { k } from '../../recipes/kata/nav'
import { useNavbar } from '../navbar/context'

export type NavListProps = ComponentPropsWithoutRef<'ul'> & {
	orientation?: 'vertical' | 'horizontal'
}

export function NavList({ orientation, className, children, ...props }: NavListProps) {
	const inNavbar = useNavbar()

	const resolvedOrientation = orientation ?? (inNavbar ? 'horizontal' : 'vertical')

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
