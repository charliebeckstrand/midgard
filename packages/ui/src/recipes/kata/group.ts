import { defineKata } from '../../core/recipe'
import { type GroupOrientation, tsunagi } from '../kiso'

/**
 * Group kata: the unit of `<Group>`. The `base` slot is the container chrome,
 * with the `orientation` axis: `inline-flex` laid out on the chosen axis, plus
 * the tsunagi selectors that drop inner radii and overlap adjacent borders by
 * the DOM position of each child. The members touch along the axis, so each
 * hit area keeps to its member there (`TouchTarget`), and two adjacent members
 * do not overlap. `--group-member-flex` is the `flex` of a member that shares
 * the length of the group, such as `ControlSkeleton`: `1` in a row, and `none`
 * in a column.
 */
export const k = defineKata({
	orientation: {
		horizontal: [
			'inline-flex flex-row [--touch-target-gap-x:0px] [--group-member-flex:1]',
			...tsunagi.horizontal,
		],
		vertical: [
			'inline-flex flex-col [--touch-target-gap-y:0px] [--group-member-flex:none]',
			...tsunagi.vertical,
		],
	} satisfies Record<GroupOrientation, string[]>,
	defaults: { orientation: 'horizontal' },
})
