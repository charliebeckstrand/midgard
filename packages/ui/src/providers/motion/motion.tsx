'use client'

import { MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'

export type MotionProps = {
	/**
	 * How descendant `motion.*` components should treat
	 * `prefers-reduced-motion`:
	 *
	 * - `'user'` (default) — respect the user's OS preference. Transform-based
	 *   animations are skipped while opacity / fade still plays.
	 * - `'always'` — always behave as if reduced motion is requested.
	 * - `'never'` — always animate, ignoring the OS preference.
	 */
	reducedMotion?: 'user' | 'always' | 'never'
	children: ReactNode
}

/**
 * App-root motion configuration — broadcast `prefers-reduced-motion` handling
 * to every descendant `motion.*` component in one place. Companion to the
 * lower-level `<ReducedMotion>` primitive, which library internals still wrap
 * at portal boundaries to keep behaviour consistent across portaled subtrees.
 */
export function Motion({ reducedMotion = 'user', children }: MotionProps) {
	return <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
}
