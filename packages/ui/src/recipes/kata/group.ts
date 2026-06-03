import { type GroupOrientation, tsunagi } from '../kiso'

/**
 * Group join classes for the container, selected by orientation. The
 * descendant selectors stay inert until `useGroup` stamps `data-group` on
 * the children. See `kiso/tsunagi` for the cascade and nesting rationale.
 */
export const k = {
	join: (orientation: GroupOrientation) => tsunagi[orientation],
}
