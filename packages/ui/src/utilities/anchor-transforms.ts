/**
 * The result of {@link anchorFollowsTransforms}, read once for each document.
 * @internal
 */
let follows: boolean | undefined

/**
 * Whether the browser puts an anchored box at the transformed box of its
 * anchor. The specification includes the transforms of the anchor and of its
 * ancestors (css-anchor-position-1 §2). Some engines that support anchor
 * positioning do not include them yet. In such an engine, a panel on a
 * reference under a transform goes to the position of the box before the
 * transform. The panel is then away from the reference that floating-ui
 * measured.
 *
 * The probe puts a hidden anchor under a translated box, and a hidden box
 * against the anchor. It compares the two boxes one time, and keeps the
 * result.
 *
 * @remarks Call it only in a browser that supports anchor positioning.
 * @internal
 */
export function anchorFollowsTransforms(): boolean {
	if (follows !== undefined) return follows

	const name = '--floating-transform-probe'

	const host = document.createElement('div')

	host.style.cssText =
		'position:absolute;top:0;left:0;transform:translateX(100px);visibility:hidden;pointer-events:none'

	const anchor = document.createElement('div')

	anchor.style.cssText = `width:1px;height:1px;anchor-name:${name}`

	host.append(anchor)

	const probe = document.createElement('div')

	probe.style.cssText = `position:absolute;top:0;width:1px;height:1px;position-anchor:${name};left:anchor(left);visibility:hidden;pointer-events:none`

	document.body.append(host, probe)

	follows = Math.abs(probe.getBoundingClientRect().left - anchor.getBoundingClientRect().left) < 1

	host.remove()

	probe.remove()

	return follows
}

/** The properties that transform a box, as `anchor()` would include them. @internal */
const TRANSFORM_PROPERTIES = ['transform', 'translate', 'scale', 'rotate', 'offset-path']

/**
 * Whether `element` or one of its ancestors has a transform. The walk goes
 * from a slotted node to its slot, and from a shadow root to its host, so it
 * follows the flattened tree.
 *
 * @internal
 */
export function inTransformedSubtree(element: Element): boolean {
	for (let node: Element | null = element; node; ) {
		const style = getComputedStyle(node)

		for (const property of TRANSFORM_PROPERTIES) {
			const value = style.getPropertyValue(property)

			if (value !== '' && value !== 'none') return true
		}

		const root = node.getRootNode()

		node =
			node.assignedSlot ?? node.parentElement ?? (root instanceof ShadowRoot ? root.host : null)
	}

	return false
}
