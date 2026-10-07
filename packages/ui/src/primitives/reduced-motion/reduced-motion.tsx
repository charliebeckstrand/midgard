'use client'

import { LazyMotion, MotionConfig, MotionConfigContext } from 'motion/react'
import { type ReactNode, use } from 'react'
import { MotionFeaturesContext, ReducedMotionContext } from './context'
import { motionFeatures } from './reduced-motion-features'

/** Props for {@link ReducedMotion}. */
export type ReducedMotionProps = {
	/**
	 * Load drag and layout projection too, for an `m` element in the subtree that
	 * sets `layout` or `layoutId`. Without it, the root loads only the animation
	 * features.
	 *
	 * @defaultValue false
	 */
	layout?: boolean
	children: ReactNode
}

/**
 * The root of each part of the library that animates with Motion. Apply it at
 * every motion-emitting root that the library controls. It does two things.
 *
 * It gives the Motion features to the `m` elements in its subtree. A component
 * takes the elements from `reduced-motion-elements`. The features load in a
 * chunk of their own after the root mounts, so no page loads them before it
 * hydrates. Until they arrive, an `m` element shows its
 * `initial` style. When they arrive, it animates to its `animate` target. When
 * the chunk has arrived before a root mounts, the root gives the features in
 * its first render. The `LazyMotion` is `strict`, so a full `motion` element in
 * the subtree throws in development.
 *
 * It makes descendant `m` elements honor the reduced-motion preference of the
 * reader: transform-based animations (translate, rotate, scale, skew) are
 * skipped while opacity / fade still plays. The preference is the platform
 * `prefers-reduced-motion` setting, or the Motion setting of
 * `AppearanceProvider`. When the Motion setting is `'reduced'`, the root sets
 * `reducedMotion` to `'always'`. Otherwise it sets `'user'`, and Motion follows
 * the platform.
 *
 * @remarks A root can render inside another root, for example a
 * `PopoverPanel` inside the `Portal` of a floating surface. When an ancestor
 * already loads the features that this root needs, this root adds no second
 * `LazyMotion`. When an ancestor already sets the same reduced-motion value,
 * this root adds no second `MotionConfig`. A `MotionConfig` merges its props
 * over the parent config, so the result is the same.
 */
export function ReducedMotion({ children, layout = false }: ReducedMotionProps) {
	const reducedMotion = use(ReducedMotionContext) ? 'always' : 'user'

	const outerFeatures = use(MotionFeaturesContext)

	const features = layout ? 'layout' : 'animation'

	let root = children

	if (outerFeatures === undefined || (layout && outerFeatures !== 'layout')) {
		root = (
			<MotionFeaturesContext value={features}>
				<LazyMotion features={motionFeatures(features)} strict>
					{root}
				</LazyMotion>
			</MotionFeaturesContext>
		)
	}

	if (use(MotionConfigContext).reducedMotion !== reducedMotion) {
		root = <MotionConfig reducedMotion={reducedMotion}>{root}</MotionConfig>
	}

	return root
}
