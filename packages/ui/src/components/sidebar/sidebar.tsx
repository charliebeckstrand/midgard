'use client'

import { cn } from '../../core'
import { ActiveIndicatorScope } from '../../primitives'
import { sidebarVariants } from './variants'

export type SidebarProps = React.ComponentPropsWithoutRef<'nav'>

export function Sidebar({ className, children, ...props }: SidebarProps) {
	return (
		<ActiveIndicatorScope>
			<nav data-slot="sidebar" className={cn(sidebarVariants(), className)} {...props}>
				{children}
			</nav>
		</ActiveIndicatorScope>
	)
}
