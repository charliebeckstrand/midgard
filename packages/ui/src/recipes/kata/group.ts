import { type GroupOrientation, tsunagi } from '../kiso'

/**
 * Container chrome for a {@link Group}: `inline-flex` laid out on the chosen
 * axis, plus the tsunagi descendant selectors that drop inner radii and overlap
 * adjacent borders. The selectors stay inert until `useGroup` stamps
 * `data-group` on the children.
 */
export const k = {
	frame: (orientation: GroupOrientation) => [
		'inline-flex',
		orientation === 'vertical' ? 'flex-col' : 'flex-row',
		tsunagi[orientation],
	],
}
