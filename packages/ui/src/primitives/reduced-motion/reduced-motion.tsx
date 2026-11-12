'use client'

import { LazyMotion, MotionConfig } from 'motion/react'
import { memo, type ReactNode, use } from 'react'
import { createContext } from '../../core/create-context'
import { MotionFeaturesContext, ReducedMotionContext } from './context'
import { type MotionFeatureSet, motionFeatures } from './reduced-motion-features'

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

/** The children of a root, for the slot under its `LazyMotion`. */
const [RootChildrenContext] = createContext<ReactNode>('RootChildren', { default: null })

/** Renders the children of the nearest root. */
function RootChildren() {
	return use(RootChildrenContext)
}

/** One element for each render, so `LazyMotion` gets the same children each time. */
const ROOT_CHILDREN = <RootChildren />

/**
 * The `LazyMotion` of a root. `LazyMotion` gives a new context value each time
 * that it renders, and each `m` element reads that value. Thus a render of
 * `LazyMotion` renders each `m` element in its subtree again. This memo renders
 * it again only when the feature set changes. The children go through a context
 * to a constant slot, so a new `children` value renders only the subtree.
 */
const RootFeatures = memo(function RootFeatures({ features }: { features: MotionFeatureSet }) {
	return (
		<LazyMotion features={motionFeatures(features)} strict>
			{ROOT_CHILDREN}
		</LazyMotion>
	)
})

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
 * `PopoverPanel` inside the `Portal` of a floating surface. Only the outermost
 * root adds a `MotionConfig`, and the nested roots read its value. A nested root
 * adds a `LazyMotion` only when it needs the layout features and the ancestor
 * does not load them. Thus the shape of the tree depends only on the position
 * of the root. A change to the reduced-motion setting changes a prop, not the
 * tree. React does not mount the subtree again.
 *
 * A render of the root does not render the `m` elements of its subtree. Only
 * the elements that render for their own reasons render.
 */
export function ReducedMotion({ children, layout = false }: ReducedMotionProps) {
	const reduced = use(ReducedMotionContext)

	const outerFeatures = use(MotionFeaturesContext)

	const features = layout ? 'layout' : 'animation'

	if (outerFeatures === 'layout' || outerFeatures === features) return children

	const root = (
		<MotionFeaturesContext value={features}>
			<RootChildrenContext value={children}>
				<RootFeatures features={features} />
			</RootChildrenContext>
		</MotionFeaturesContext>
	)

	if (outerFeatures !== undefined) return root

	return <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>{root}</MotionConfig>
}
