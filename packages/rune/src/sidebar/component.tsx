import type { HTMLAttributes } from 'react'

import { sidebarInnerVariants, sidebarVariants } from './variants.js'

export type SidebarProps = HTMLAttributes<HTMLDivElement> & {
	header?: React.ReactNode
	padding?: 'none' | 'small' | 'medium' | 'large'
}

export function Sidebar({ padding, className, children, header, ...rest }: SidebarProps) {
	return (
		<div className={sidebarVariants({ padding, className })} {...rest}>
			{header ?? <div>{header}</div>}
			<div className={sidebarInnerVariants({ padding })}>{children}</div>
		</div>
	)
}
