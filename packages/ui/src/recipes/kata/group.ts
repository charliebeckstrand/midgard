import { type GroupOrientation, tsunagi } from '../kiso'

/**
 * Both frames, joined once at module load.
 *
 * A string rather than the array this used to build per call, because `cn` can only
 * memoize a call whose every argument is keyable. An array sends the whole thing to the
 * plain `twMerge` (`core/cn.ts`, `keyable`). The frame is eleven arbitrary-variant tsunagi
 * selectors, so that merge is not cheap, and every `Group` in the app was paying it on every
 * render. Nothing here varies at runtime, so there was never a reason to rebuild it.
 *
 * @internal
 */
const frames = {
	horizontal: ['inline-flex flex-row [--touch-target-gap-x:0px]', ...tsunagi.horizontal].join(' '),
	// A vertical group stretches each member to its width, so the outer edges line
	// up. `w-auto` overrides the `w-fit` of a member such as Button.
	vertical: ['inline-flex flex-col [--touch-target-gap-y:0px] *:w-auto', ...tsunagi.vertical].join(
		' ',
	),
} as const satisfies Record<GroupOrientation, string>

/**
 * Container chrome for a {@link Group}: `inline-flex` laid out on the chosen
 * axis, plus the tsunagi descendant selectors that drop inner radii and overlap
 * adjacent borders. The selectors stay inert until `useGroup` stamps
 * `data-group` on the children. The members touch along the axis, so each hit
 * area keeps to its member there (`TouchTarget`), and two adjacent members do
 * not overlap.
 */
export const k = {
	frame: (orientation: GroupOrientation) => frames[orientation],
}
