import { control } from '../genkei/control'
import { kasane, kokkaku } from '../kiso'

const { frame } = control

/**
 * Density-keyed corner radius for the outer frame. Lives here (not in
 * `genkei/control.density`) because the radius needs the frame element,
 * not the inner input that `density` is applied to. `<ControlFrame>`
 * reads it through `useDensity()` so the chrome radius matches the inner
 * input's `py` at every step: sm → 1.5, md → 2, lg → 2.5.
 */
const frameRadius = {
	sm: kasane.radius('1.5'),
	md: kasane.radius('2'),
	lg: kasane.radius('2.5'),
} as const

export const k = {
	skeleton: kokkaku.formControl,
	frame,
	frameRadius,
}
