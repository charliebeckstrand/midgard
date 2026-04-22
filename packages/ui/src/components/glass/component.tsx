import type React from 'react'
import { GlassProvider } from './context'

export type GlassProps = {
	className?: string
	children: React.ReactNode
}

/** Enables glass mode for all glass-aware descendants. */
export function Glass({ className, children }: GlassProps) {
	return (
		<GlassProvider value={true}>
			<span data-slot="glass" className={className ?? 'contents'}>
				{children}
			</span>
		</GlassProvider>
	)
}
