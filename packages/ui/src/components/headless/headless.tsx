import type { ReactNode } from 'react'
import { HeadlessProvider } from './context'

export type HeadlessProps = {
	className?: string
	children: ReactNode
}

/** Strips chrome from headless-aware descendants — they render the bare semantic element. */
export function Headless({ className, children }: HeadlessProps) {
	return (
		<HeadlessProvider value={true}>
			<span data-slot="headless" className={className ?? 'contents'}>
				{children}
			</span>
		</HeadlessProvider>
	)
}
