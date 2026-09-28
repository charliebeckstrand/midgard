import { kokkaku } from '../kiso'
import { control } from '../kiso/control'

const { frame } = control

/**
 * The radius of `<ControlFrame>`: the outer box, the inset fill, and the
 * overlay. It is the same as `py` at each step, and it takes the step of the
 * nearest density scope.
 */
const frameRadius = [
	'density-rounded-[1.5,2,2.5]',
	'before:density-rounded-ring-[1.5,2,2.5]',
	'after:density-rounded-[1.5,2,2.5]',
] as const

export const k = {
	skeleton: kokkaku.control,
	frame: {
		base: frame,
		radius: frameRadius,
	},
}
