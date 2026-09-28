import { kokkaku } from '../kiso'
import { control } from '../kiso/control'

const { frame } = control

/**
 * The radius of `<ControlFrame>`: the outer box, the inset fill, and the
 * overlay. It is the same as `py` at each step, and it takes the step of the
 * nearest density scope. The fill and the overlay are pseudo-elements, so
 * their classes name the steps before the pseudo-element.
 */
const frameRadius = [
	'density-rounded-[1.5,2,2.5]',
	'density-[xs,sm]:before:rounded-ring-1.5',
	'density-md:before:rounded-ring-2',
	'density-[lg,xl]:before:rounded-ring-2.5',
	'density-[xs,sm]:after:rounded-[--spacing(1.5)]',
	'density-md:after:rounded-[--spacing(2)]',
	'density-[lg,xl]:after:rounded-[--spacing(2.5)]',
] as const

export const k = {
	skeleton: kokkaku.control,
	frame: {
		base: frame,
		radius: frameRadius,
	},
}
