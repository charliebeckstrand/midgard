'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import { k } from '../../recipes/kata/nav'
import { useNavbar } from '../navbar/context'

export type NavListProps = ComponentPropsWithoutRef<'div'> & {
	orientation?: 'vertical' | 'horizontal'
}

export function NavList({ orientation, className, children, ...props }: NavListProps) {
	const inNavbar = useNavbar()

	const resolvedOrientation = orientation ?? (inNavbar ? 'horizontal' : 'vertical')

	// A styled flex container for the links inside the enclosing <nav> landmark.
	// Not a menubar: site navigation is a set of links — each individually
	// Tab-focusable, the current one marked `aria-current="page"` — not an
	// application menu. The menu role would mislead assistive tech and impose a
	// roving keyboard model that navigation links don't use.
	return (
		<ActiveIndicatorScope>
			<div
				data-slot="nav-list"
				data-orientation={resolvedOrientation}
				className={cn(k.list.base, k.list.orientation[resolvedOrientation], className)}
				{...props}
			>
				{children}
			</div>
		</ActiveIndicatorScope>
	)
}
