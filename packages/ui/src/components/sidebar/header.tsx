'use client'

import type React from 'react'
import { useContext } from 'react'
import { cn } from '../../core'
import { CloseIcon } from '../../primitives'
import { iconSlot } from '../../recipes/icon'
import { MobileSidebarContext } from '../layouts/context'

export function SidebarHeader({
	className,
	children,
	...props
}: React.ComponentPropsWithoutRef<'div'>) {
	const close = useContext(MobileSidebarContext)

	if (close) {
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
					onClick={close}
					aria-label="Close navigation"
					className={cn(
						'rounded-lg fill-current p-2.5 text-zinc-950 hover:bg-zinc-950/5',
						'dark:text-white dark:hover:bg-white/5',
						...iconSlot,
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
