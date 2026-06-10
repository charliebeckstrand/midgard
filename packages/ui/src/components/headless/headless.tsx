'use client'

import type { ReactNode } from 'react'
import { HeadlessContext } from './context'

export type HeadlessProps = {
	children: ReactNode
}

/**
 * Strips chrome from headless-aware descendants; they render the bare
 * semantic element. Renders as a pass-through (no host element), keeping the
 * disabled child a direct child of any surrounding `ControlFrame` and
 * `kasane`'s `has-[>:disabled]` selectors intact.
 */
export function Headless({ children }: HeadlessProps) {
	return <HeadlessContext value={true}>{children}</HeadlessContext>
}
