import { kasane, kokkaku } from '../kiso'
import { control } from '../kiso/control'

const { radius } = kasane
const { frame } = control

/**
 * Density-keyed corner radius for the outer frame element. Applied via
 * `useDensity()` in `<ControlFrame>` — radius tracks `py` at each step:
 * sm → 1.5, md → 2, lg → 2.5.
 */
const frameRadius = {
	sm: radius.all('1.5'),
	md: radius.all('2'),
	lg: radius.all('2.5'),
} as const

export const k = {
	skeleton: kokkaku.control,
	frame,
	frameRadius,
}
