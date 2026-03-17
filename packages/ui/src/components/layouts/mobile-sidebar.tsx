'use client'

import type React from 'react'
import { cn } from '../../core'
import { Overlay, SlidePanel } from '../../primitives'
import { sidebarBackdrop } from '../../recipes'
import { MobileSidebarContext } from './context'

export function MobileSidebar({
	open,
	close,
	header,
	children,
}: React.PropsWithChildren<{
	open: boolean
	close: () => void
	header?: React.ReactNode
}>) {
	return (
		<Overlay
			open={open}
			onClose={close}
			className={sidebarBackdrop}
			role="dialog"
			aria-modal="true"
		>
			<SlidePanel>
				<MobileSidebarContext.Provider value={close}>
					<div
						className={cn(
							'flex h-full flex-col rounded-lg bg-white shadow-xs ring-1 ring-zinc-950/5',
							'dark:bg-zinc-900 dark:ring-white/10',
						)}
					>
						{header}
						{children}
					</div>
				</MobileSidebarContext.Provider>
			</SlidePanel>
		</Overlay>
	)
}
