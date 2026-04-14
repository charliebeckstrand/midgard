'use client'

import { cn } from '../../core'
import { ActiveIndicatorScope } from '../../primitives'
import { katachi } from '../../recipes'

const k = katachi.sidebar

export type SidebarProps = React.ComponentPropsWithoutRef<'nav'>

export function Sidebar({
	'aria-label': ariaLabel = 'Sidebar',
	className,
	children,
	...props
}: SidebarProps) {
	return (
		<ActiveIndicatorScope>
			<nav data-slot="sidebar" aria-label={ariaLabel} className={cn(k.base, className)} {...props}>
				{children}
			</nav>
		</ActiveIndicatorScope>
	)
}
