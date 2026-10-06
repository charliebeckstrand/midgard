'use client'

import { createContext } from '../../core'
import type { DensityLevel } from '../density/context'

/** Color theme preference an `<AppearanceProvider>` holds: a fixed theme, or `'system'` to follow the OS. */
export type ThemeMode = 'light' | 'dark' | 'system'

/** Selectable theme modes with display labels, for use in theme pickers. */
export const themeModes: { label: string; value: ThemeMode }[] = [
	{ label: 'Light', value: 'light' },
	{ label: 'Dark', value: 'dark' },
	{ label: 'System', value: 'system' },
]

/**
 * Motion preference an `<AppearanceProvider>` holds: `'system'` follows the
 * platform `prefers-reduced-motion` setting, and `'reduced'` reduces motion on
 * each platform.
 */
export type MotionMode = 'system' | 'reduced'

/** Selectable motion modes with display labels, for use in motion pickers. */
export const motionModes: { label: string; value: MotionMode }[] = [
	{ label: 'System', value: 'system' },
	{ label: 'Reduced', value: 'reduced' },
]

/** Appearance state and setters that {@link useAppearance} returns. */
export type AppearanceContextValue = {
	theme: ThemeMode
	density: DensityLevel
	motion: MotionMode
	setTheme: (theme: ThemeMode) => void
	setDensity: (density: DensityLevel) => void
	setMotion: (motion: MotionMode) => void
}

/**
 * Reads the persisted theme, density, and motion from the nearest
 * `<AppearanceProvider>`, with their setters. Throws outside a provider.
 */
export const [AppearanceContext, useAppearance] = createContext<AppearanceContextValue>(
	'Appearance',
	{ error: 'useAppearance must be used within <AppearanceProvider>' },
)
