import { kokkaku } from '../kiso'
import { control } from '../kiso/control'

const { frame, radius } = control

/**
 * The radius of `<ControlFrame>`: the outer box, the inset fill, and the
 * overlay. It is the same as `py` at each step, and it takes the step of the
 * nearest density scope. The fill and the overlay are pseudo-elements, so
 * their classes name the steps before the pseudo-element. The fill sits 1px
 * inside the box, so its radius is 1px less at each step. The overlay fills
 * the box, so it inherits the radius of the box.
 */
const frameRadius = [
	radius,
	'density-xs:before:rounded-ring-1',
	'density-sm:before:rounded-ring-1.5',
	'density-md:before:rounded-ring-2',
	'density-lg:before:rounded-ring-2.5',
	'density-xl:before:rounded-ring-3',
	'after:rounded-[inherit]',
] as const

export const k = {
	skeleton: kokkaku.control,
	frame: {
		base: frame,
		radius: frameRadius,
	},
}

/** The size scale of the control: each step from `xs` to `xl`. */
export const scale = control.scale
