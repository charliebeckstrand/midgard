'use client'

import type { FeatureBundle, LazyFeatureBundle } from 'motion/react'
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

const importers: Record<MotionFeatureSet, () => Promise<FeatureBundle>> = {
	animation: () =>
		import('./reduced-motion-features-animation').then((module) => module.domAnimation),
	layout: () => import('./reduced-motion-features-layout').then((module) => module.domMax),
}

/** The bundle of each set that has arrived. */
const loaded: Partial<Record<MotionFeatureSet, FeatureBundle>> = {}

/** The load of each set that is in progress or done. */
const pending: Partial<Record<MotionFeatureSet, Promise<FeatureBundle>>> = {}

/**
 * Loads the chunk of a feature set one time. Each later call gets the same
 * promise. If the load fails, the next call tries again.
 *
 * @internal
 */
export function loadMotionFeatures(set: MotionFeatureSet): Promise<FeatureBundle> {
	let load = pending[set]

	if (!load) {
		load = importers[set]().then(
			(bundle) => {
				loaded[set] = bundle

				// `domMax` holds each feature of `domAnimation`, so it serves both sets.
				if (set === 'layout') loaded.animation ??= bundle

				return bundle
			},
			(error: unknown) => {
				pending[set] = undefined

				throw error
			},
		)

		pending[set] = load
	}

	return load
}

const lazyBundles: Record<MotionFeatureSet, LazyFeatureBundle> = {
	animation: () => loadMotionFeatures('animation'),
	layout: () => loadMotionFeatures('layout'),
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
	return loaded[set] ?? lazyBundles[set]
}

/**
 * Loads the animation features when the browser is idle. A surface that opens
 * on the first press, such as a menu or a dialog, then finds them ready. Its
 * enter animation starts in its first frame.
 *
 * @returns A function that cancels the load if it has not started.
 * @internal
 */
export function prefetchMotionFeatures(): () => void {
	if (loaded.animation) return noop

	// Safari has no `requestIdleCallback`. There, the load starts after a
	// timeout of 1 ms.
	const idle = window.requestIdleCallback ?? ((call: () => void) => window.setTimeout(call, 1))

	const cancel = window.cancelIdleCallback ?? window.clearTimeout

	const handle = idle(() => {
		loadMotionFeatures('animation').catch(noop)
	})

	return () => cancel(handle)
}
