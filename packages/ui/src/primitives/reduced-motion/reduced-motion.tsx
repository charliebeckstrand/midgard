'use client'

import { MotionConfig, MotionConfigContext } from 'motion/react'
import { type ReactNode, use } from 'react'

/**
 * Makes descendant `motion.*` components honor the user's
 * `prefers-reduced-motion` preference: transform-based animations
 * (translate, rotate, scale, skew) are skipped while opacity / fade still
 * plays. Apply at every motion-emitting root the library controls.
 *
 * @remarks A root can render inside another root, for example a
 * `PopoverPanel` inside the `PresencePortal` of a floating surface. When an
 * ancestor already sets the preference, this renders `children` directly and
 * adds no second `MotionConfig`. A `MotionConfig` merges its props over the
 * parent config, so the result is the same.
 */
export function ReducedMotion({ children }: { children: ReactNode }) {
	if (use(MotionConfigContext).reducedMotion === 'user') return children

	return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
