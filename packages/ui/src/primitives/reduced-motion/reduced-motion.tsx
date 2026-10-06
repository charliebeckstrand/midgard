'use client'

import { MotionConfig, MotionConfigContext } from 'motion/react'
import { type ReactNode, use } from 'react'
import { ReducedMotionContext } from './context'

/**
 * Makes descendant `motion.*` components honor the reduced-motion preference
 * of the reader: transform-based animations (translate, rotate, scale, skew)
 * are skipped while opacity / fade still plays. Apply at every motion-emitting
 * root the library controls.
 *
 * The preference is the platform `prefers-reduced-motion` setting, or the
 * Motion setting of `AppearanceProvider`. When the Motion setting is
 * `'reduced'`, the root sets `reducedMotion` to `'always'`. Otherwise it sets
 * `'user'`, and Motion follows the platform.
 *
 * @remarks A root can render inside another root, for example a
 * `PopoverPanel` inside the `Portal` of a floating surface. When an
 * ancestor already sets the same value, this renders `children` directly and
 * adds no second `MotionConfig`. A `MotionConfig` merges its props over the
 * parent config, so the result is the same.
 */
export function ReducedMotion({ children }: { children: ReactNode }) {
	const reducedMotion = use(ReducedMotionContext) ? 'always' : 'user'

	if (use(MotionConfigContext).reducedMotion === reducedMotion) return children

	return <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
}
