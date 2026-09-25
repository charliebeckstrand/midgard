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

/** Appearance state and setters that {@link useAppearance} returns. */
export type AppearanceContextValue = {
	theme: ThemeMode
	density: DensityLevel
	setTheme: (theme: ThemeMode) => void
	setDensity: (density: DensityLevel) => void
}

/**
 * Reads the persisted theme and density from the nearest `<AppearanceProvider>`,
 * with their setters. Throws outside a provider.
 */
export const [AppearanceContext, useAppearance] = createContext<AppearanceContextValue>(
	'Appearance',
	{ error: 'useAppearance must be used within <AppearanceProvider>' },
)
