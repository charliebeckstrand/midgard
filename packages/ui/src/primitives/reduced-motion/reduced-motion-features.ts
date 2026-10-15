'use client'

import type { FeatureBundle, LazyFeatureBundle } from 'motion/react'
import { createLazyModule, type LazyModule } from '../../utilities/lazy-module'
import { noop } from '../../utilities/noop'

/**
 * A set of Motion features that a `ReducedMotion` root loads.
 *
 * - `'animation'` is `domAnimation`: the animations, `exit`, and the hover, tap,
 *   focus, and in-view gestures.
 * - `'layout'` is `domMax`: the animation features, plus drag and layout
 *   projection (`layout` and `layoutId`).
 *
 * @internal
 */
export type MotionFeatureSet = 'animation' | 'layout'

/** The chunk of each set, which loads one time. */
const chunks: Record<MotionFeatureSet, LazyModule<FeatureBundle>> = {
	animation: createLazyModule(() =>
		import('./reduced-motion-features-animation').then((module) => module.domAnimation),
	),
	layout: createLazyModule(() =>
		import('./reduced-motion-features-layout').then((module) => module.domMax),
	),
}

/**
 * Loads the chunk of a feature set one time. Each later call gets the same
 * promise. If the load fails, the next call tries again.
 *
 * @internal
 */
export function loadMotionFeatures(set: MotionFeatureSet): Promise<FeatureBundle> {
	return chunks[set].load()
}

/** The bundle that serves a set, or `null` before it arrives. */
function readMotionFeatures(set: MotionFeatureSet): FeatureBundle | null {
	// `domMax` holds each feature of `domAnimation`, so it serves both sets.
	return chunks[set].read() ?? chunks.layout.read()
}

/**
 * The `features` value for the `LazyMotion` of a root. Before the chunk
 * arrives, it is a function that loads the chunk, and `LazyMotion` calls it
 * after the root mounts. After the chunk arrives, it is the bundle itself. Thus a
 * root that mounts later, such as a dialog that opens, gets the features in its
 * first render.
 *
 * @internal
 */
export function motionFeatures(set: MotionFeatureSet): FeatureBundle | LazyFeatureBundle {
	return readMotionFeatures(set) ?? chunks[set].load
}

/**
 * Loads the animation features when the browser is idle. A surface that opens
 * on the first press, such as a menu or a dialog, then finds them ready. Its
 * enter animation starts in its first frame. Safari has no
 * `requestIdleCallback`. There, the load starts after a timeout of 1 ms.
 *
 * @returns A function that cancels the load if it has not started.
 * @internal
 */
export function prefetchMotionFeatures(): () => void {
	if (readMotionFeatures('animation')) return noop

	return chunks.animation.idle(1)
}
