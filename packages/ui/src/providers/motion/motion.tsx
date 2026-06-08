'use client'

import { MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'

type MotionProps = {
	/**
	 * How descendant framer `motion.*` components treat `prefers-reduced-motion`:
	 *
	 * - `'user'` (default) — respect the user's OS preference. Transform-based
	 *   animations are skipped while opacity / fade still plays.
	 * - `'always'` — always behave as if reduced motion is requested.
	 *
	 * There is deliberately no "force animate" mode: an app must not be able to
	 * override a user who has asked their OS to reduce motion.
	 */
	reducedMotion?: 'user' | 'always'
	children: ReactNode
}

/**
 * App-root motion configuration — broadcast `prefers-reduced-motion` handling
 * to descendant framer `motion.*` components in one place. Companion to the
 * lower-level `<ReducedMotion>` primitive, which library internals still wrap
 * at portal boundaries to keep behaviour consistent across portaled subtrees.
 *
 * Scope is intentionally narrow: this only configures framer `motion.*`. The
 * library's CSS transitions (`motion-safe:` utilities) and imperative
 * animations (odometer, hold-button) read the OS preference directly,
 * unaffected by this provider. The override can only ever *reduce* motion,
 * never add it.
 */
export function Motion({ reducedMotion = 'user', children }: MotionProps) {
	return <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
}
