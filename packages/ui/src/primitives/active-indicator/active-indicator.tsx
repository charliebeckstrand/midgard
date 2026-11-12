'use client'

import { LayoutGroup, type MotionStyle, useComposedRefs, visualElementStore } from 'motion/react'
import { type ComponentProps, type ReactNode, useId } from 'react'
import { cn } from '../../core/cn'
import { createContext } from '../../core/create-context'
import { k } from '../../recipes/kata/active-indicator'
import { ReducedMotion } from '../reduced-motion'
import * as m from '../reduced-motion/reduced-motion-elements'

// Default indicator corner radius (px). Kept inline (not a Tailwind class) so
// Motion's layout projection can apply inverse-scale correction to it during
// the shared-element morph.
const INDICATOR_RADIUS = 8

/** The leading translate of a Motion projection transform, with no depth. */
const TRANSLATE_3D = /^translate3d\(([^,]+), ([^,]+), 0px\)/

/**
 * The transform template of the marker: it writes the translate of the morph as
 * a 2D `translate()`.
 *
 * Motion writes the translate of a layout projection as `translate3d()`, also
 * with no depth. WebKit gives an element with a 3D transform function a
 * compositing layer of its own. The marker then has a layer for the duration of
 * the morph and none at rest. The label of the item paints above the marker in
 * the page, but iOS Safari painted the label below the layer of the marker. The
 * label went out of view under the marker for the morph and came back at rest.
 * With a 2D translate, the marker paints in the layer of its item, in the order
 * of the page, so the label stays above it.
 *
 * Motion calls the template with an empty transform to reset the marker, so an
 * empty transform becomes `none`, as Motion writes it with no template.
 */
function flatTransform(_values: unknown, generated: string) {
	return generated === '' ? 'none' : generated.replace(TRANSLATE_3D, 'translate($1, $2)')
}

/**
 * The ref of the marker: it removes the snapshot that the projection node of
 * the marker kept from its own unmount.
 *
 * Motion measures a node with a `layoutId` when the node unmounts, so that the
 * next marker of the group can morph from that box. A hidden `<Activity>`
 * detaches the marker but keeps its node, so the node keeps the box. Motion
 * measures the box in the commit that hides the marker, before that commit
 * sets the final layout. For example, the view that becomes visible can be
 * above the marker in the page at that time. When the `<Activity>` shows the
 * marker again, Motion morphs from that box, and the marker slides in from
 * another position. A marker that mounts morphs only from the marker that it
 * replaces (`resumeFrom`), never from a box of its own.
 *
 * Motion calls this ref after it mounts the node. A new node has no snapshot,
 * so the ref changes nothing on a usual mount.
 */
function dropOwnSnapshot(marker: HTMLSpanElement | null) {
	if (marker === null) return

	const projection = visualElementStore.get(marker)?.projection

	if (projection) projection.snapshot = undefined
}

/**
 * Carries the `LayoutGroup` `layoutId` an `ActiveIndicatorScope` opens, letting
 * descendant `ActiveIndicator`s share one morph scope; `undefined` outside a
 * scope, falling back to the global `'current-indicator'` id.
 *
 * @internal
 */
const [ActiveIndicatorScopeContext, useActiveIndicatorScope] = createContext<string | undefined>(
	'ActiveIndicatorScope',
	{ default: undefined },
)

/** Props for {@link ActiveIndicatorScope}: the group whose indicators share one morph. */
export type ActiveIndicatorScopeProps = {
	/** The nav or tab group. */
	children: ReactNode
}

/**
 * Scopes active indicators to a single nav / tab group, wrapping children in a
 * Motion `LayoutGroup`. Descendant {@link ActiveIndicator}s then morph against
 * each other rather than against indicators in sibling groups.
 *
 * @remarks Wraps the group in {@link ReducedMotion}, so under reduced motion the
 * indicator moves to the new item with no morph. The root loads layout
 * projection, which the morph needs. Until it arrives, the indicator moves with
 * no morph.
 * @see {@link useActiveIndicatorScope}
 */
export function ActiveIndicatorScope({ children }: ActiveIndicatorScopeProps) {
	const layoutId = `current-indicator-${useId()}`

	return (
		<ActiveIndicatorScopeContext value={layoutId}>
			<ReducedMotion layout>
				<LayoutGroup id={layoutId}>{children}</LayoutGroup>
			</ReducedMotion>
		</ActiveIndicatorScopeContext>
	)
}

/**
 * Props for {@link ActiveIndicator}. The marker `<m.span>` takes the rest,
 * except `children` and the keys that Motion gives its own meaning (as in
 * `CurrentContent`).
 */
export type ActiveIndicatorProps = Omit<
	ComponentProps<'span'>,
	'children' | 'style' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
> & {
	/**
	 * The inline style of the marker. A `borderRadius` here replaces the default radius.
	 * A Motion style, so the morph can correct the radius as it scales.
	 */
	style?: MotionStyle
}

/**
 * Visual marker that morphs between sibling items via Motion's shared-element
 * transition. Resolves its morph-scope id from the nearest
 * {@link ActiveIndicatorScope}, falling back to the global `'current-indicator'`.
 *
 * @remarks Decorative (`pointer-events-none`): it paints behind the item and
 * never intercepts presses. Defaults to an `8px` corner radius, set inline so
 * Motion's layout projection can inverse-scale it mid-morph. The morph moves it
 * with a 2D transform. Thus it gets no compositing layer in WebKit, and the
 * label of the item stays above it in each frame. A marker that a hidden
 * `<Activity>` shows again paints at its item at once, with no morph.
 * @see {@link ActiveIndicatorScope}
 */
export function ActiveIndicator({ className, style, ref, ...props }: ActiveIndicatorProps) {
	const scopedLayoutId = useActiveIndicatorScope()

	const setMarker = useComposedRefs(ref, dropOwnSnapshot)

	const layoutId = scopedLayoutId ?? 'current-indicator'

	// Unique per instance, stable across renders. With `layoutDependency`
	// constant, external reflow does not animate the indicator.
	const instanceId = useId()

	return (
		<ReducedMotion layout>
			<m.span
				data-slot="active-indicator"
				{...props}
				ref={setMarker}
				layoutId={layoutId}
				layoutDependency={instanceId}
				className={cn('pointer-events-none absolute inset-0', k().base, className)}
				// Motion's layout projection applies inverse-scale correction to inline
				// `borderRadius` during the shared-element transition.
				style={{ borderRadius: INDICATOR_RADIUS, ...style }}
				transformTemplate={flatTransform}
				transition={k.spring}
			/>
		</ReducedMotion>
	)
}
