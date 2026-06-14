'use client'

import { MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'

type MotionProps = {
	/**
	 * How descendant framer `motion.*` components treat `prefers-reduced-motion`:
	 *
	 * - `'user'` (default): respects the user's OS preference. Transform-based
	 *   animations are skipped while opacity / fade still plays.
	 * - `'always'`: behaves as if reduced motion is requested.
	 *
	 * There is no "force animate" mode; an app cannot override a user's OS
	 * reduced-motion preference.
	 *
	 * @defaultValue 'user'
	 */
	reducedMotion?: 'user' | 'always'
	children: ReactNode
}

/**
 * App-root motion configuration: broadcasts `prefers-reduced-motion` handling
 * to descendant framer `motion.*` components in one place. Companion to the
 * lower-level `<ReducedMotion>` primitive, which library internals wrap at
 * portal boundaries for consistent behaviour across portaled subtrees.
 *
 * Scope is narrow: this configures framer `motion.*` only. The library's CSS
 * transitions (`motion-safe:` utilities) and imperative animations (odometer,
 * hold-button) read the OS preference directly, unaffected by this provider.
 * The override only ever *reduces* motion, never adds it.
 */
export function Motion({ reducedMotion = 'user', children }: MotionProps) {
	return <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
}
