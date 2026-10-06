'use client'

import { createContext } from '../../core'
import type { DensityLevel } from '../density/context'
import type { MotionMode, ThemeMode } from './modes'

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
