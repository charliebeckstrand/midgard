import type { ReactNode } from 'react'
import { GlassContext } from './context'

export type GlassProps = {
	className?: string
	children: ReactNode
}

/** Enables glass mode for all glass-aware descendants. */
export function Glass({ className, children }: GlassProps) {
	return (
		<GlassContext value={true}>
			<span data-slot="glass" className={className ?? 'contents'}>
				{children}
			</span>
		</GlassContext>
	)
}
