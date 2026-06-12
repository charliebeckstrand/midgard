import { type GroupOrientation, tsunagi } from '../kiso'

/**
 * The descendant selectors stay inert until `useGroup` stamps `data-group`
 * on the children.
 */
export const k = {
	join: (orientation: GroupOrientation) => tsunagi[orientation],
}
