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

	// A real <ul> of links inside the enclosing <nav> landmark — not a menubar:
	// site navigation is a set of links, each individually Tab-focusable with the
	// current one marked `aria-current="page"`, not an application menu with a
	// roving keyboard model. The list element restores the count/position
	// semantics CSS flex would otherwise strip; Tailwind preflight zeroes its
	// default margin/padding/marker, so it lays out exactly like the prior div.
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
