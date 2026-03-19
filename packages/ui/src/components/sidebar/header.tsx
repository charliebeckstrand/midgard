'use client'

import type React from 'react'
import { cn } from '../../core'
import { CloseIcon } from '../../primitives'
import { katachi } from '../../recipes'
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
				className={cn(
					'flex flex-row items-center border-b border-zinc-950/5 p-4 dark:border-white/5',
					className,
				)}
			>
				<div className="flex flex-1 flex-col [&>[data-slot=section]+[data-slot=section]]:mt-2.5">
					{children}
				</div>
				<button
					type="button"
					onClick={offcanvas.close}
					aria-label="Close navigation"
					className={cn(
						'rounded-lg fill-current p-2 text-zinc-950 hover:bg-zinc-950/5',
						'dark:text-white dark:hover:bg-white/5',
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
				'flex flex-col border-b border-zinc-950/5 p-4 dark:border-white/5 [&>[data-slot=section]+[data-slot=section]]:mt-2.5',
				className,
			)}
		>
			{children}
		</div>
	)
}
