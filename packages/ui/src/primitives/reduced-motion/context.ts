'use client'

import { createContext } from '../../core'
import type { MotionFeatureSet } from './reduced-motion-features'

/**
 * Whether the Motion setting of the app asks for reduced motion.
 * `AppearanceProvider` gives it, and it is `false` outside one.
 * `usePrefersReducedMotion` and `ReducedMotion` read it with the platform
 * preference, so the setting reaches each JS reader of reduced motion.
 *
 * @internal
 */
export const [ReducedMotionContext] = createContext<boolean>('ReducedMotion', { default: false })

/**
 * The Motion features that the nearest `ReducedMotion` root loads for its
 * subtree. It is `undefined` outside a root. A nested root reads it and adds no
 * second `LazyMotion` when the outer root already loads the features it needs.
 *
 * @internal
 */
export const [MotionFeaturesContext] = createContext<MotionFeatureSet | undefined>(
	'MotionFeatures',
	{ default: undefined },
)
