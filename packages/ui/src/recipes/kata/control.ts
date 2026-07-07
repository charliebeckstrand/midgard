import { kasane, kokkaku } from '../kiso'
import { control } from '../kiso/control'

const { radius } = kasane
const { frame } = control

/** Applied via `useDensity()` in `<ControlFrame>`; radius tracks `py` at each step. */
const frameRadius = {
	sm: radius.all('1.5'),
	md: radius.all('2'),
	lg: radius.all('2.5'),
} as const

export const k = {
	skeleton: kokkaku.control,
	frame: {
		base: frame,
		radius: frameRadius,
	},
}
