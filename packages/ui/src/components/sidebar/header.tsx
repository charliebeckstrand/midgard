'use client'

import type React from 'react'
import { cn } from '../../core'
import { CloseIcon } from '../../primitives'
import { kage, katachi, sumi } from '../../recipes'
import { useOffcanvas } from '../layouts/context'

export function SidebarHeader({
	className,
	children,
	...props
}: React.ComponentPropsWithoutRef<'div'>) {
	const offcanvas = useOffcanvas()

	if (offcanvas) {
		return (
			<div
				{...props}
				className={cn(`flex flex-row items-center border-b ${kage.usui} p-4`, className)}
			>
				<div className="flex flex-1 flex-col [&>[data-slot=section]+[data-slot=section]]:mt-2.5">
					{children}
				</div>
				<button
					type="button"
					onClick={offcanvas.close}
					aria-label="Close navigation"
					className={cn(
						`rounded-lg fill-current p-2 ${sumi.base} hover:bg-zinc-950/5 dark:hover:bg-white/5`,
						...katachi.iconSlot,
						'*:data-[slot=icon]:fill-current',
					)}
				>
					<CloseIcon />
				</button>
			</div>
		)
	}

	return (
		<div
			{...props}
			className={cn(
				`flex flex-col border-b ${kage.usui} p-4 [&>[data-slot=section]+[data-slot=section]]:mt-2.5`,
				className,
			)}
		>
			{children}
		</div>
	)
}
