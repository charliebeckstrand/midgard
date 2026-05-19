import type { ReactNode } from 'react'
import { HeadlessProvider } from './context'

export type HeadlessProps = {
	children: ReactNode
}

/**
 * Strips chrome from headless-aware descendants — they render the bare
 * semantic element. Renders as a pass-through (no host element) so the
 * disabled child remains a direct child of any surrounding `ControlFrame`,
 * keeping `kasane`'s `has-[>:disabled]` selectors intact.
 */
export function Headless({ children }: HeadlessProps) {
	return <HeadlessProvider value={true}>{children}</HeadlessProvider>
}
