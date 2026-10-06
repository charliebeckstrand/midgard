'use client'

import { createContext } from '../../core'

/**
 * Whether the Motion setting of the app asks for reduced motion.
 * `AppearanceProvider` gives it, and it is `false` outside one.
 * `usePrefersReducedMotion` and `ReducedMotion` read it with the platform
 * preference, so the setting reaches each JS reader of reduced motion.
 *
 * @internal
 */
export const [ReducedMotionContext] = createContext<boolean>('ReducedMotion', { default: false })
