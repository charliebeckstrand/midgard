import type { StoredChoice } from '../../utilities/stored-choice.ts'
import { type DensityLevel, densityLevels } from '../density/context.ts'
import {
	type MotionMode,
	motionModes,
	type SidebarMode,
	type SurfaceMode,
	sidebarModes,
	surfaceModes,
	type ThemeMode,
	themeModes,
} from './modes.ts'

/**
 * The theme choice. With no stored choice, it follows the OS.
 *
 * @internal
 */
export const THEME: StoredChoice<ThemeMode> = {
	key: 'theme',
	values: themeModes.map((option) => option.value),
	fallback: 'system',
}

/**
 * The density choice.
 *
 * @internal
 */
export const DENSITY: StoredChoice<DensityLevel> = {
	key: 'density',
	values: densityLevels.map((level) => level.value),
	fallback: 'snug',
}

/**
 * The motion choice. With no stored choice, it follows the platform.
 *
 * @internal
 */
export const MOTION: StoredChoice<MotionMode> = {
	key: 'motion',
	values: motionModes.map((option) => option.value),
	fallback: 'system',
}

/**
 * The sidebar choice. With no stored choice, the sidebar is locked.
 *
 * @internal
 */
export const SIDEBAR: StoredChoice<SidebarMode> = {
	key: 'sidebar',
	values: sidebarModes.map((option) => option.value),
	fallback: 'locked',
}

/**
 * The surfaces choice. With no stored choice, the surfaces are solid.
 *
 * @internal
 */
export const SURFACES: StoredChoice<SurfaceMode> = {
	key: 'surfaces',
	values: surfaceModes.map((option) => option.value),
	fallback: 'solid',
}

/**
 * Media query that is true when the OS prefers a dark color scheme.
 *
 * @internal
 */
export const DARK_SCHEME = '(prefers-color-scheme: dark)'
