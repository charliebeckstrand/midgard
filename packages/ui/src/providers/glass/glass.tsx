import type { ReactNode } from 'react'
import { GlassContext } from './context'

export type GlassProviderProps = {
	className?: string
	children: ReactNode
}

/** Enables glass mode for all glass-aware descendants. */
export function GlassProvider({ className, children }: GlassProviderProps) {
	return (
		<GlassContext value={true}>
			<span data-slot="glass" className={className ?? 'contents'}>
				{children}
			</span>
		</GlassContext>
	)
}
