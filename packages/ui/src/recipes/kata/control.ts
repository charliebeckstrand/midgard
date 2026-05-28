import { kasane, kokkaku } from '../kiso'
import { control } from '../kiso/control'

const { radius } = kasane
const { frame } = control

/**
 * Density-keyed corner radius for the outer frame. Lives here (not in
 * `kiso/control/density`) because the radius needs the frame element,
 * not the inner input that `density` is applied to. `<ControlFrame>`
 * reads it through `useDensity()` so the chrome radius matches the inner
 * input's `py` at every step: sm → 1.5, md → 2, lg → 2.5.
 */
const frameRadius = {
	sm: radius.stack('1.5'),
	md: radius.stack('2'),
	lg: radius.stack('2.5'),
} as const

export const k = {
	skeleton: kokkaku.control,
	frame,
	frameRadius,
}
