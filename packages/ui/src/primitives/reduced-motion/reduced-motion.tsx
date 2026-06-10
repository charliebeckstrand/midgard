'use client'

import { MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'

/**
 * Makes descendant `motion.*` components honour the user's
 * `prefers-reduced-motion` preference: transform-based animations
 * (translate, rotate, scale, skew) are skipped while opacity / fade still
 * plays. Apply at every motion-emitting root the library controls.
 */
export function ReducedMotion({ children }: { children: ReactNode }) {
	return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
