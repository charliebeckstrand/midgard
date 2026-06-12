import type { ReactNode } from 'react'
import { GlassContext } from './context'

export type GlassProviderProps = {
	/** Set `false` to suspend glass mode without remounting the subtree. */
	enabled?: boolean
	className?: string
	children: ReactNode
}

/** Enables glass mode for all glass-aware descendants. */
export function GlassProvider({ enabled = true, className, children }: GlassProviderProps) {
	return (
		<GlassContext value={enabled}>
			<span data-slot={enabled ? 'glass' : undefined} className={className ?? 'contents'}>
				{children}
			</span>
		</GlassContext>
	)
}
