'use client'

import type { ReactNode } from 'react'
import { HeadlessContext } from './context'

/** Props for {@link HeadlessProvider}. */
export type HeadlessProviderProps = {
	children: ReactNode
}

/**
 * Escape-hatch provider that strips chrome from headless-aware descendants so
 * they render the bare semantic element.
 *
 * @remarks
 * Renders as a pass-through (no host element), keeping the disabled child a
 * direct child of any surrounding `ControlFrame` and `kasane`'s
 * `has-[>:disabled]` selectors intact. Only components that read
 * {@link useHeadless} respond; others are unaffected.
 *
 * @see {@link useHeadless} — the flag descendants read.
 */
export function HeadlessProvider({ children }: HeadlessProviderProps) {
	return <HeadlessContext value={true}>{children}</HeadlessContext>
}
