'use client'

import type React from 'react'
import { cn } from '../../core'
import { Overlay, SlidePanel } from '../../primitives'
import { omote } from '../../recipes'
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
		<Overlay open={open} onClose={close} className={omote.sidebar} role="dialog" aria-modal="true">
			<SlidePanel>
				<MobileSidebarContext.Provider value={close}>
					<div className={cn(`flex h-full flex-col rounded-lg ${omote.card}`)}>
						{header}
						{children}
					</div>
				</MobileSidebarContext.Provider>
			</SlidePanel>
		</Overlay>
	)
}
